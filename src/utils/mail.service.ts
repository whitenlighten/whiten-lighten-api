import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Interface must be defined outside the class
interface MailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.config.get<string>('SMTP_PORT') || 465);
    const secure = this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
      tls: {
        // for dev, if needed; in prod prefer valid certs
        rejectUnauthorized: this.config.get<string>('SMTP_REJECT_UNAUTHORIZED') !== 'false',
      },
    });

    this.transporter.verify((err, success) => {
      if (err) {
        this.logger.error('SMTP verification failed', err);
      } else {
        this.logger.log('SMTP transporter verified; ready to send emails');
      }
      if (success) {
        this.logger.log('SMTP transporter verification succeeded');
      }
    });
  }

  private formatFrom(): string {
    return this.config.get<string>('EMAIL_FROM') || this.config.get<string>('SMTP_USER') || '';
  }

  // This is the generic send method, it accepts individual arguments
  async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const result = await this.transporter.sendMail({
        from: this.formatFrom(),
        to,
        subject,
        text,
        html: html || text,
      });

      this.logger.log(`Mail sent to ${to} (messageId=${(result as any)?.messageId})`);
      return result;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, (err as any).stack || err);
      // Throw for flows that expect error; caller can catch and decide
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  // --- EXISTING METHODS (UNCHANGED) ---
  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const subject = 'Password reset request';
    const text = `Reset your password using this link: ${resetUrl}`;
    const html = `
      <p>You requested a password reset.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> (link expires soon).</p>
      <p>If you didn't request this, ignore this email.</p>
    `;
    return this.sendMail(to, subject, text, html);
  }

  async sendWelcomeEmail(
    to: string,
    name: string | undefined,
    role: string,
    maybePassword?: string,
  ) {
    // ... implementation unchanged
    const subject = `🎉 Welcome to Whiten Lighten Clinic — ${role} 🎉`;
    const text = `
Hi ${name ?? ''},
Your account has been created successfully.
Username: ${to}
${maybePassword ? `Password: ${maybePassword}` : ''}
Please log in and change your password immediately.
    `;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9fc; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #e0e0e0; padding: 32px;">
          <div style="text-align: center;">
            <img src="https://img.icons8.com/color/96/000000/tooth.png" alt="Clinic Logo" style="margin-bottom: 16px;" />
            <h2 style="color: #2d6cdf; margin-bottom: 8px;">Welcome${name ? `, ${name}` : ''}!</h2>
            
            <p style="font-size: 1.1em; color: #444;">
              We're excited to have you join <strong>CelebDent Clinic</strong> as a 
              <span style="color: #2d6cdf;">${role}</span>.
            </p>
          </div>

          <div style="margin: 24px 0; text-align: center;">
            <p style="color: #222; font-weight: 500;">Your login credentials:</p>
            <div style="background: #f1f6ff; border-radius: 6px; padding: 12px; font-size: 1.1em; color: #2d6cdf; text-align: left; display: inline-block;">
              <p><strong>Username:</strong> ${to}</p>
              ${
                maybePassword
                  ? `<p><strong>Password:</strong> ${maybePassword}</p>`
                  : ''
              }
            </div>
            <p style="font-size: 0.95em; color: #888;">
              Please log in and change your password immediately for security.
            </p>
          </div>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 0.98em; text-align: center;">
            If you have any questions, reply to this email or contact our support team.<br/>
            <span style="color: #2d6cdf;">Welcome aboard!</span>
          </p>
        </div>
      </div>
    `;
    return this.sendMail(to, subject, text, html);
  }


 

  // --- UPDATED METHOD SIGNATURE for consistency ---
  async sendAppointmentNotificationToPatient(
    to: string,
    patientName: string,
    appointmentDateTime: string, // Changed from appointmentDate (string) to appointmentDateTime (string) for clarity
    doctorName?: string,
    patientId?: string, // Added patientId/misc. param just in case (as it was passed in the create call) but not used in the email body
  ) {
    const subject = '🦷 Appointment Confirmation';
    const text = `Dear ${patientName}, your appointment has been booked for ${appointmentDateTime}${doctorName ? ` with ${doctorName}` : ''}.`;
    const html = `
      <h2>Appointment Confirmation</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment has been successfully booked for <strong>${appointmentDateTime}</strong>${doctorName ? ` with <strong>Dr. ${doctorName}</strong>` : ''}.</p>
      <p>We look forward to seeing you!</p>
    `;
    return this.sendMail(to, subject, text, html);
  }

  // ✅ Front desk (and super admin) appointment notification
  async sendAppointmentNotificationToFrontdesk(
    to: string,
    subject: string, // Changed to receive a custom subject
    text: string, // Changed to receive a custom text/message
    html?: string,
  ) {
    // The AppointmentsService is now passing the subject and message directly, 
    // so we simplify this method to use the generic one.
    return this.sendMail(to, subject, text, html);
  }


  async sendAppointmentNotification(to: string, subject: string, text: string, html?: string) {
    return this.sendMail(to, subject, text, html);
  }
  

  
  // --- NEW METHOD: Doctor Appointment Confirmation ---
  async sendConfirmationToDoctor(
    to: string,
    doctorName: string | undefined,
    patientName: string,
    appointmentDateTime: string,
    service: string,
  ) {
    const subject = '✅ APPOINTMENT CONFIRMED: Ready for Patient Visit';
    const text = `Dear Dr. ${doctorName ?? ''}, The appointment with patient ${patientName} on ${appointmentDateTime} for service ${service} has been CONFIRMED.`;
    const html = `
      <h3>Appointment Confirmed</h3>
      <p>Dear Dr. ${doctorName ?? ''},</p>
      <p>The appointment with patient <strong>${patientName}</strong> on <strong>${appointmentDateTime}</strong> 
      for service **${service}** has been **CONFIRMED** and finalized.</p>
      <p>Please review the patient's record on your dashboard before the visit.</p>
    `;
    return this.sendMail(to, subject, text, html);
  }

}
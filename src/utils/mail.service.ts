// src/mail/mail.service.ts
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

  // This method is correctly using the generic sendMail
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

  // This method is correctly using the generic sendMail
  async sendWelcomeEmail(
    to: string,
    name: string | undefined,
    role: string,
    maybePassword?: string,
  ) {
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


  // This method is correctly using the generic sendMail
  async sendAccountApprovalEmail(to: string, name?: string) {
    const subject = 'Your Patient Account Has Been Approved';
    const text = `Hello ${name ?? ''}, your patient account has been approved. You can now log in.`;
    const html = `
      <h3>Hello ${name ?? ''},</h3>
      <p>Your patient account has been approved. You can now log in and manage appointments.</p>
    `;
    return this.sendMail(to, subject, text, html);
  }

  // ✅ Patient appointment confirmation
  async sendAppointmentNotificationToPatient(
    to: string,
    patientName: string,
    appointmentDate: string,
    doctorName?: string,
  ) {
    const subject = '🦷 Appointment Confirmation';
    const text = `Dear ${patientName}, your appointment has been booked for ${appointmentDate}${doctorName ? ` with ${doctorName}` : ''}.`;
    const html = `
      <h2>Appointment Confirmation</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment has been successfully booked for <strong>${appointmentDate}</strong>${doctorName ? ` with <strong>${doctorName}</strong>` : ''}.</p>
      <p>We look forward to seeing you!</p>
    `;
    return this.sendMail(to, subject, text, html);
  }

  // ✅ Front desk (and super admin) appointment notification
  async sendAppointmentNotificationToFrontdesk(
    to: string,
    patientName: string,
    appointmentDate: string,
    doctorName?: string,
  ) {
    const subject = '🦷 New Appointment Alert';
    const text = `A new appointment has been booked for ${patientName} on ${appointmentDate}${doctorName ? ` with ${doctorName}` : ''}.`;
    const html = `
      <h2>New Appointment Alert</h2>
      <p><strong>Patient:</strong> ${patientName}</p>
      <p><strong>Date & Time:</strong> ${appointmentDate}</p>
      ${doctorName ? `<p><strong>Doctor:</strong> ${doctorName}</p>` : ''}
      <p>Please log in to the system for more details.</p>
    `;
    return this.sendMail(to, subject, text, html);
  }


  async sendAppointmentNotification(to: string, subject: string, text: string, html?: string) {
    return this.sendMail(to, subject, text, html);
  }

  async sendPatientApproval(to: string, name?: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/forgot-password`;
    const subject = `✅ Your Patient Registration Has Been Approved`;
    const text = `Dear ${name ?? 'Patient'}, your registration has been approved. You can now log in and access our services.`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); padding: 32px;">

          <div style="text-align: center;">
            <img src="https://whitenlightentac.com/wp-content/uploads/2025/08/cropped-IMG_2958-136x89.png" alt="Logo" />
            <h2 style="color: #2d6cdf; margin-bottom: 8px;">Good News${name ? `, ${name}` : ''}!</h2>
            <p style="font-size: 1.1em; color: #444;">
              Your <strong>patient registration</strong> at
              <span style="color: #2d6cdf;">Whiten Lighten Clinic</span> has been approved.
            </p>
          </div>

          <p>For security reasons, you will need to set your password before you can log in.</p>
          <p>
            <a href="${resetUrl}"
              style="background-color: #007BFF; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Reset Your Password
            </a>
          </p>
          <p>If the button doesn’t work, copy and paste this link into your browser:</p>
          <p style="color: #555;">${resetUrl}</p>
          <br/>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />

          <p style="color: #666; font-size: 0.95em; text-align: center;">
            If you need help, reply to this email or contact our support team.<br/>
            <span style="color: #2d6cdf;">We’re here to care for you ❤️</span>
          </p>
        </div>
      </div>
    `;

    return this.sendMail(to, subject, text, html);
  }

  async sendPatientUpdatePendingApproval(
    email: string,
    firstName: string,
    appointmentDateTime: string,
  ) {
    const subject = '🔔 Update on Your Appointment Request';

    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 30px; color: #333;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 30px;">

          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://whitenlightentac.com/wp-content/uploads/2025/08/cropped-IMG_2958-136x89.png" alt="Clinic Logo" style="width: 80px; height: auto;" />
          </div>

          <h2 style="text-align: center; color: #2563eb; margin-bottom: 10px;">
            Hello ${firstName},
          </h2>
          <p style="text-align: center; font-size: 16px; color: #555; margin-bottom: 25px;">
            We’ve updated your details and noted your new appointment request.
          </p>

          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0; font-size: 15px; color: #333;">
              <strong>📅 Appointment:</strong><br/>
              <span style="font-size: 16px; color: #111;">${appointmentDateTime}</span>
            </p>
          </div>

          <p style="font-size: 15px; color: #444; line-height: 1.6;">
            Your account is still <strong style="color: #eab308;">pending approval</strong>. Once approved, you’ll be able to log in and access your patient portal.
          </p>

          <p style="font-size: 15px; margin-top: 25px; color: #444;">
            Thank you,<br/>
            <span style="font-weight: bold; color: #2563eb;">Care Team</span>
          </p>

        </div>

        <p style="text-align: center; font-size: 12px; color: #888; margin-top: 25px;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `;

    await this.sendMail(email, subject, 'Update on your appointment request', html);

  }
}
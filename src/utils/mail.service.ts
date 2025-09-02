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
    const text = `${name ?? ''}, your account has been created with role: ${role}.${maybePassword ? ` Temporary password: ${maybePassword}` : ''}`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9fc; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #e0e0e0; padding: 32px;">
          <div style="text-align: center;">
            <img src="https://img.icons8.com/color/96/000000/tooth.png" alt="Clinic Logo" style="margin-bottom: 16px;" />
            <h2 style="color: #2d6cdf; margin-bottom: 8px;">Welcome${name ? `, ${name}` : ''}!</h2>
            <p style="font-size: 1.1em; color: #444;">We're excited to have you join <strong>CelebDent Clinic</strong> as a <span style="color: #2d6cdf;">${role}</span>.</p>
          </div>
          ${
            maybePassword
              ? `
            <div style="margin: 24px 0; text-align: center;">
              <p style="color: #222; font-weight: 500;">Your temporary password:</p>
              <div style="background: #f1f6ff; border-radius: 6px; padding: 12px; font-size: 1.2em; letter-spacing: 1px; color: #2d6cdf; display: inline-block;">
                <code>${maybePassword}</code>
              </div>
              <p style="font-size: 0.95em; color: #888;">Please change it after your first login for security.</p>
            </div>
          `
              : ''
          }
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

  // This method is correctly using the generic sendMail
  async sendAppointmentConfirmation(
    to: string,
    patientName: string | undefined,
    appointmentDate: string,
    meta?: { doctorName?: string },
  ) {
    const subject = 'Appointment Confirmation';
    const text = `Hello ${patientName ?? ''}, your appointment is scheduled for ${appointmentDate}${meta?.doctorName ? ` with Dr. ${meta.doctorName}` : ''}.`;
    const html = `
      <h3>Appointment Confirmed</h3>
      <p>Hello ${patientName ?? ''},</p>
      <p>Your appointment is scheduled for <strong>${appointmentDate}</strong>${meta?.doctorName ? ` with <strong>Dr. ${meta.doctorName}</strong>` : ''}.</p>
    `;
    return this.sendMail(to, subject, text, html);
  }

  async sendAppointmentNotificationToPatient(
    to: string,
    patientName: string | undefined,
    patientId: string,
    appointmentDate: string,
    doctorName?: string,
    location?: string,
    notes?: string,
  ) {
    const subject = '🦷 Your Appointment is Confirmed!';
    const text = `Hello ${patientName ?? ''}, your appointment is scheduled for ${appointmentDate}${doctorName ? ` with Dr. ${doctorName}` : ''}${location ? ` at ${location}` : ''}.${notes ? ` Notes: ${notes}` : ''} (Patient ID: ${patientId})`;

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; padding: 32px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #e0e0e0; padding: 32px;">
        <div style="text-align: center;">
          <img src="https://img.icons8.com/color/96/000000/calendar--v2.png" alt="Appointment" style="margin-bottom: 16px;" />
          <h2 style="color: #2d6cdf; margin-bottom: 8px;">Appointment Confirmed</h2>
          <p style="font-size: 1.1em; color: #444;">Hello${patientName ? `, <strong>${patientName}</strong>` : ''}!</p>
        </div>

        <!-- 🔥 Patient ID Section -->
        <div style="margin: 24px 0; text-align: center;">
          <p style="font-size: 1.4em; font-weight: bold; color: #000; background: #fef3c7; padding: 12px 20px; border-radius: 8px; display: inline-block;">
            Patient ID: <span style="color: #b91c1c;">${patientId}</span>
          </p>
        </div>

        <div style="margin: 24px 0; text-align: center;">
          <p style="color: #222; font-weight: 500;">Your appointment details:</p>
          <ul style="list-style: none; padding: 0; color: #2d6cdf; font-size: 1.08em;">
            <li><strong>Date & Time:</strong> ${appointmentDate}</li>
            ${doctorName ? `<li><strong>Doctor:</strong> Dr. ${doctorName}</li>` : ''}
            ${location ? `<li><strong>Location:</strong> ${location}</li>` : ''}
            ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
          </ul>
        </div>

        <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 0.98em; text-align: center;">
          Please arrive 10 minutes early. If you need to reschedule, reply to this email.<br/>
          <span style="color: #2d6cdf;">We look forward to seeing you!</span>
        </p>
      </div>
    </div>
  `;

    return this.sendMail(to, subject, text, html);
  }

  async sendAppointmentNotificationToFrontdesk(
    to: string,
    patientName: string,
    appointmentDate: string,
    doctorName?: string,
    location?: string,
    notes?: string,
  ) {
    const subject = '🦷 New Appointment Scheduled';
    const text = `Frontdesk, a new appointment has been scheduled for ${patientName} on ${appointmentDate}${doctorName ? ` with Dr. ${doctorName}` : ''}${location ? ` at ${location}` : ''}.${notes ? ` Notes: ${notes}` : ''}`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; padding: 32px;">
        <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #e0e0e0; padding: 32px;">
          <div style="text-align: center;">
            <img src="https://img.icons8.com/color/96/000000/appointment-reminders--v2.png" alt="Frontdesk Notification" style="margin-bottom: 16px;" />
            <h2 style="color: #2d6cdf; margin-bottom: 8px;">New Appointment Scheduled</h2>
            <p style="font-size: 1.1em; color: #444;">Patient: <strong>${patientName}</strong></p>
          </div>
          <div style="margin: 24px 0; text-align: left;">
            <p style="color: #222; font-weight: 500;">Appointment Details:</p>
            <ul style="list-style: none; padding: 0; color: #2d6cdf; font-size: 1.08em;">
              <li><strong>Date & Time:</strong> ${appointmentDate}</li>
              ${doctorName ? `<li><strong>Doctor:</strong> Dr. ${doctorName}</li>` : ''}
              ${location ? `<li><strong>Location:</strong> ${location}</li>` : ''}
              ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
            </ul>
          </div>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 0.98em; text-align: center;">
            Please ensure all preparations are made for this appointment.<br/>
            <span style="color: #2d6cdf;">Thank you for keeping our clinic running smoothly!</span>
          </p>
        </div>
      </div>
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

        <!-- Header -->
        <div style="text-align: center;">
          <img src="https://whitenlightentac.com/wp-content/uploads/2025/08/cropped-IMG_2958-136x89.png" alt="Logo" />
          <h2 style="color: #2d6cdf; margin-bottom: 8px;">Good News${name ? `, ${name}` : ''}!</h2>
          <p style="font-size: 1.1em; color: #444;">
            Your <strong>patient registration</strong> at
            <span style="color: #2d6cdf;">Whiten Lighten Clinic</span> has been approved.
          </p>
        </div>

        <!-- Highlight -->
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

        <!-- Divider -->
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />

        <!-- Footer -->
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

        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://whitenlightentac.com/wp-content/uploads/2025/08/cropped-IMG_2958-136x89.png" alt="Clinic Logo" style="width: 80px; height: auto;" />
        </div>

        <!-- Header -->
        <h2 style="text-align: center; color: #2563eb; margin-bottom: 10px;">
          Hello ${firstName},
        </h2>
        <p style="text-align: center; font-size: 16px; color: #555; margin-bottom: 25px;">
          We’ve updated your details and noted your new appointment request.
        </p>

        <!-- Appointment details -->
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0; font-size: 15px; color: #333;">
            <strong>📅 Appointment:</strong><br/>
            <span style="font-size: 16px; color: #111;">${appointmentDateTime}</span>
          </p>
        </div>

        <!-- Status note -->
        <p style="font-size: 15px; color: #444; line-height: 1.6;">
          Your account is still <strong style="color: #eab308;">pending approval</strong>. Once approved, you’ll be able to log in and access your patient portal.
        </p>

        <!-- Closing -->
        <p style="font-size: 15px; margin-top: 25px; color: #444;">
          Thank you,<br/>
          <span style="font-weight: bold; color: #2563eb;">Care Team</span>
        </p>

      </div>

      <!-- Footer -->
      <p style="text-align: center; font-size: 12px; color: #888; margin-top: 25px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;

    await this.sendMail(email, subject, 'Update on your appointment request', html);

  }
}

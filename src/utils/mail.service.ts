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

  async sendAppointmentNotification(to: string, subject: string, text: string, html?: string) {
    return this.sendMail(to, subject, text, html);
  }
}

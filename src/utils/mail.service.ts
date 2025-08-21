import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465, // use SSL
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER, // your Gmail address
        pass: process.env.SMTP_PASS, // your App Password
      },
    });
  }

  /**
   * Generic mail sender
   */
  async sendMail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Hospital System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html: html || text,
      });
    } catch (error) {
      console.error('❌ Mail sending failed:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Use the link below:\n\n${resetUrl}`;
    const html = `
      <h3>Password Reset Request</h3>
      <p>You requested a password reset. Click the link below:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>If you didn’t request this, please ignore this email.</p>
    `;
    await this.sendMail(to, subject, text, html);
  }

  /**
   * Send Account Approval Email
   */
  async sendAccountApprovalEmail(to: string): Promise<void> {
    const subject = 'Your Account Has Been Approved';
    const text =
      'Congratulations! Your account has been approved. You can now log in.';
    const html = `
      <h3>Account Approved</h3>
      <p>Congratulations! Your account has been approved. You can now log in.</p>
    `;
    await this.sendMail(to, subject, text, html);
  }

  /**
   * Send Appointment Confirmation
   */
  async sendAppointmentConfirmation(
    to: string,
    appointmentDate: string,
  ): Promise<void> {
    const subject = 'Appointment Confirmation';
    const text = `Your appointment has been scheduled for ${appointmentDate}.`;
    const html = `
      <h3>Appointment Confirmed</h3>
      <p>Your appointment has been scheduled for <strong>${appointmentDate}</strong>.</p>
    `;
    await this.sendMail(to, subject, text, html);
  }
}

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Starting test-email script...');
console.log('SMTP Config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  from: process.env.EMAIL_FROM,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  console.log('Attempting to send test email...');
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'michealagunbiade1@gmail.com', // Replace with your actual email
      subject: 'Test Email',
      text: 'This is a test email from Nodemailer!',
    });
    console.log('Test email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testEmail();
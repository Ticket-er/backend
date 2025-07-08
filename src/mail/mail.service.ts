import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { generateOtpTemplate } from './templates/otp-email.template';

@Injectable()
export class MailService {
  private transporter;
  private logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendOtp(email: string, name: string, otp: string) {
    const htmlContent = generateOtpTemplate(name, otp);

    const mailOptions = {
      from: `"Ticketer" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code',
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}`, error.stack);
      throw error;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  generateOtpTemplate,
  registrationTemplate,
  loginTemplate,
  changePasswordTemplate,
  eventCreationTemplate,
  ticketPurchaseTemplate,
  ticketResaleTemplate,
} from './templates';

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

  private async sendMail(to: string, subject: string, html: string) {
    const mailOptions = {
      from: `"Ticketer" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Mail sent to ${to} | Subject: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send mail to ${to}`, error.stack);
      throw error;
    }
  }

  async sendOtp(email: string, name: string, otp: string) {
    await this.sendMail(email, 'Your OTP Code', generateOtpTemplate(name, otp));
  }

  async sendRegistrationMail(email: string, name: string) {
    await this.sendMail(
      email,
      'Welcome to Ticketer 🎉',
      registrationTemplate(name),
    );
  }

  async sendLoginMail(email: string, name: string) {
    await this.sendMail(email, 'You just logged in 👀', loginTemplate(name));
  }

  async sendChangePasswordMail(email: string, name: string) {
    await this.sendMail(
      email,
      'Your Password Was Changed ✅',
      changePasswordTemplate(name),
    );
  }

  async sendEventCreationMail(email: string, name: string, eventName: string) {
    await this.sendMail(
      email,
      'Event Created 🎫',
      eventCreationTemplate(name, eventName),
    );
  }

  async sendTicketPurchaseMail(
    email: string,
    name: string,
    ticketName: string,
    event: string,
  ) {
    await this.sendMail(
      email,
      'Ticket Purchase Confirmation 🎟️',
      ticketPurchaseTemplate(name, ticketName, event),
    );
  }

  async sendTicketResaleMail(email: string, name: string, ticketName: string) {
    await this.sendMail(
      email,
      'Your Ticket Was Listed for Resale 🔁',
      ticketResaleTemplate(name, ticketName),
    );
  }
}

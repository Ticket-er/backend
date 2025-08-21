import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import {
  generateOtpTemplate,
  registrationTemplate,
  loginTemplate,
  changePasswordTemplate,
  eventCreationTemplate,
} from './templates';
import { generateTicketQR, QRTicketData } from 'src/common/utils/qrCode.utils';
import {
  TicketDetails,
  ticketPurchaseAdminTemplate,
  ticketPurchaseBuyerTemplate,
  ticketPurchaseOrganizerTemplate,
  ticketResaleAdminTemplate,
  ticketResaleBuyerTemplate,
  ticketResaleOrganizerTemplate,
  ticketResaleSellerTemplate,
  ticketResaleTemplate,
} from './templates/ticket-purchase.template';

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

  async sendTicketPurchaseBuyerMail(
    email: string,
    name: string,
    event: string,
    tickets: {
      ticketId: string;
      code: string;
      qrData: QRTicketData;
      categoryName: string;
    }[],
  ) {
    const ticketDetails: TicketDetails[] = await Promise.all(
      tickets.map(async ({ ticketId, code, qrData, categoryName }) => ({
        ticketId,
        code,
        categoryName,
        qrCodeDataUrl: await generateTicketQR(qrData),
      })),
    );

    await this.sendMail(
      email,
      'Ticket Purchase Confirmation 🎟️',
      ticketPurchaseBuyerTemplate(name, event, ticketDetails),
    );
  }

  async sendTicketPurchaseOrganizerMail(
    email: string,
    name: string,
    event: string,
    ticketCount: number,
    proceeds: number,
    ticketCategories: string[],
  ) {
    await this.sendMail(
      email,
      'New Ticket Sale for Your Event 🎉',
      ticketPurchaseOrganizerTemplate(
        name,
        event,
        ticketCount,
        proceeds,
        ticketCategories,
      ),
    );
  }

  async sendTicketPurchaseAdminMail(
    email: string,
    name: string,
    event: string,
    ticketCount: number,
    platformCut: number,
    buyerName: string,
    ticketCategories: string[],
  ) {
    await this.sendMail(
      email,
      'New Platform Transaction 📊',
      ticketPurchaseAdminTemplate(
        name,
        event,
        ticketCount,
        platformCut,
        buyerName,
        ticketCategories,
      ),
    );
  }

  async sendTicketResaleBuyerMail(
    email: string,
    name: string,
    event: string,
    tickets: {
      ticketId: string;
      code: string;
      qrData: QRTicketData;
      categoryName: string;
    }[],
  ) {
    const ticketDetails: TicketDetails[] = await Promise.all(
      tickets.map(async ({ ticketId, code, qrData, categoryName }) => ({
        ticketId,
        code,
        categoryName,
        qrCodeDataUrl: await generateTicketQR(qrData),
      })),
    );

    await this.sendMail(
      email,
      'Resale Ticket Purchase Confirmation 🎟️',
      ticketResaleBuyerTemplate(name, event, ticketDetails),
    );
  }

  async sendTicketResaleSellerMail(
    email: string,
    name: string,
    event: string,
    ticketCount: number,
    proceeds: number,
    ticketCategories: string[],
  ) {
    await this.sendMail(
      email,
      'Your Ticket Has Been Sold 💸',
      ticketResaleSellerTemplate(
        name,
        event,
        ticketCount,
        proceeds,
        ticketCategories,
      ),
    );
  }

  async sendTicketResaleOrganizerMail(
    email: string,
    name: string,
    event: string,
    ticketCount: number,
    royalty: number,
    ticketCategories: string[],
  ) {
    await this.sendMail(
      email,
      'Resale Royalty for Your Event',
      ticketResaleOrganizerTemplate(
        name,
        event,
        ticketCount,
        royalty,
        ticketCategories,
      ),
    );
  }

  async sendTicketResaleAdminMail(
    email: string,
    name: string,
    event: string,
    ticketCount: number,
    platformCut: number,
    buyerName: string,
    sellerName: string,
    ticketCategories: string[],
  ) {
    await this.sendMail(
      email,
      'New Resale Transaction 📊',
      ticketResaleAdminTemplate(
        name,
        event,
        ticketCount,
        platformCut,
        buyerName,
        sellerName,
        ticketCategories,
      ),
    );
  }

  async sendTicketResaleListingMail(
    email: string,
    name: string,
    event: string,
  ) {
    await this.sendMail(
      email,
      'Your Ticket Was Listed for Resale 🔁',
      ticketResaleTemplate(name, event),
    );
  }
}

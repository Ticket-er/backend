import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InitiateDto } from './dto/initiate.dto';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { generateVerificationCode } from 'src/common/utils/qrCode.utils';

@Injectable()
export class PaymentService {
  private readonly paymentBaseUrl = process.env.PAYMENT_GATEWAY_URL;
  private readonly paymentSecretKey = process.env.PAYMENT_GATEWAY_TEST_SECRET;
  private logger = new Logger(PaymentService.name);

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async initiatePayment(data: InitiateDto): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.paymentBaseUrl}/api/v1/initiate`,
        data,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYMENT_GATEWAY_TEST_SECRET}`,
          },
        },
      );

      return response?.data?.checkout_url ?? null;
    } catch (error) {
      console.error('[PaymentService] Initiate Payment Error:', {
        message: error?.message,
        responseData: error?.response?.data,
        status: error?.response?.status,
      });

      throw new Error(
        error?.response?.data?.message || 'Failed to initiate payment',
      );
    }
  }

  async initiateWithdrawal(data: any): Promise<any> {
    const response = await this.httpService.axiosRef.post(
      `${this.paymentBaseUrl}/api/v1/payout`,
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYMENT_GATEWAY_TEST_SECRET}`,
        },
      },
    );

    return response?.data ?? null;
  }

  async verifyTransaction(reference: string) {
    try {
      this.logger.log(`Verifying transaction with reference: ${reference}`);

      // Step 1: Verify with third-party
      const { data } = await this.httpService.axiosRef.get(
        `${this.paymentBaseUrl}/api/v1/transactions/verify?reference=${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paymentSecretKey}`,
          },
        },
      );

      if (!data.status || data.message !== 'verification successful') {
        throw new BadRequestException('Transaction verification failed');
      }

      // Step 2: Lock transaction row to prevent race conditions
      const transaction = await this.prisma.$transaction(async (tx) => {
        const txn = await tx.transaction.findUnique({
          where: { reference },
          include: {
            event: {
              include: {
                organizer: true,
              },
            },
            tickets: { include: { ticket: true } },
            user: true,
          },
        });

        if (!txn) throw new NotFoundException('Transaction not found');

        if (txn.status === 'SUCCESS') {
          return { alreadyProcessed: true, txn };
        }

        await tx.transaction.update({
          where: { reference },
          data: { status: 'SUCCESS' },
        });

        return { alreadyProcessed: false, txn };
      });

      if (transaction.alreadyProcessed) {
        return { message: 'Already verified', success: true };
      }

      const { txn } = transaction;

      let ticketIds = txn.tickets
        .filter((tt) => tt.ticket && tt.ticket.id)
        .map((tt) => tt.ticket.id);

      // PURCHASE FLOW
      if (txn.type === 'PURCHASE') {
        const ticketCount =
          ticketIds.length ||
          (txn.event?.price ? Math.floor(txn.amount / txn.event.price) : 0);

        if (ticketIds.length === 0) {
          const newTicketIds: string[] = [];

          for (let i = 0; i < ticketCount; i++) {
            const ticketData: any = { userId: txn.userId };
            if (txn.eventId) ticketData.eventId = txn.eventId;

            const ticket = await this.prisma.ticket.create({
              data: ticketData,
            });
            newTicketIds.push(ticket.id);
          }

          await this.prisma.transaction.update({
            where: { reference },
            data: {
              tickets: {
                create: newTicketIds.map((id) => ({
                  ticket: { connect: { id } },
                })),
              },
            },
          });

          ticketIds = newTicketIds;
        }

        if (!txn.eventId || !txn.event)
          throw new NotFoundException(
            'Event data missing for purchase transaction',
          );

        await this.prisma.event.update({
          where: { id: txn.eventId },
          data: { minted: { increment: ticketIds.length } },
        });

        const platformCut = Math.floor(
          (txn.amount * txn.event.primaryFeeBps) / 10000,
        );
        const organizerProceeds = txn.amount - platformCut;

        await this.prisma.wallet.update({
          where: { userId: txn.event.organizerId },
          data: { balance: { increment: organizerProceeds } },
        });

        const platformAdmin = await this.prisma.user.findUnique({
          where: { email: process.env.ADMIN_EMAIL },
        });

        if (platformAdmin) {
          await this.prisma.wallet.upsert({
            where: { userId: platformAdmin.id },
            create: { userId: platformAdmin.id, balance: platformCut },
            update: { balance: { increment: platformCut } },
          });
        }

        // Prepare tickets for buyer email with QR codes
        const tickets = await this.prisma.ticket.findMany({
          where: { id: { in: ticketIds } },
        });

        const ticketDetails = tickets.map((ticket) => {
          if (!txn.eventId || !txn.userId || !ticket.code) {
            throw new Error('Missing data for verification code generation');
          }

          return {
            ticketId: ticket.id,
            code: ticket.code,
            qrData: {
              ticketId: ticket.id,
              eventId: txn.eventId,
              userId: txn.userId,
              code: ticket.code,
              verificationCode: generateVerificationCode(
                ticket.code,
                txn.eventId,
                txn.userId,
              ),
              timestamp: Date.now(),
            },
          };
        });

        // Send emails
        try {
          // Buyer email
          await this.mailService.sendTicketPurchaseBuyerMail(
            txn.user.email,
            txn.user.name,
            txn.event.name,
            ticketDetails,
          );

          // Organizer email
          await this.mailService.sendTicketPurchaseOrganizerMail(
            txn.event.organizer.email,
            txn.event.organizer.name,
            txn.event.name,
            ticketIds.length,
            organizerProceeds,
          );

          // Admin email
          if (platformAdmin) {
            await this.mailService.sendTicketPurchaseAdminMail(
              platformAdmin.email,
              platformAdmin.name,
              txn.event.name,
              ticketIds.length,
              platformCut,
              txn.user.name,
            );
          }
        } catch (err) {
          this.logger.error(`Failed to send purchase emails`, err.stack);
        }
      }

      // RESALE FLOW
      else if (txn.type === 'RESALE') {
        if (!ticketIds.length) {
          throw new BadRequestException(
            'No ticket IDs found for resale transaction',
          );
        }

        const tickets = await this.prisma.ticket.findMany({
          where: { id: { in: ticketIds } },
          include: { event: true, user: true },
        });

        if (tickets.length !== ticketIds.length) {
          throw new NotFoundException('One or more tickets not found');
        }

        const event = tickets[0].event;
        if (!event) throw new NotFoundException('Event not found');

        let totalPlatformCut = 0;
        let totalOrganizerRoyalty = 0;
        let totalSellerProceeds = 0;

        for (const ticket of tickets) {
          const seller = ticket.user;
          if (!seller) throw new NotFoundException('Seller not found');

          if (
            !ticket.resalePrice ||
            !ticket.accountNumber ||
            !ticket.bankCode
          ) {
            throw new BadRequestException(
              `Ticket ${ticket.id} is missing resale price or payout info`,
            );
          }

          const platformCut = Math.floor(
            (ticket.resalePrice * event.resaleFeeBps) / 10000,
          );
          const organizerRoyalty = Math.floor(
            (ticket.resalePrice * event.royaltyFeeBps) / 10000,
          );
          const sellerProceeds =
            ticket.resalePrice - (platformCut + organizerRoyalty);

          totalPlatformCut += platformCut;
          totalOrganizerRoyalty += organizerRoyalty;
          totalSellerProceeds += sellerProceeds;

          const newCode = await this.generateUniqueTicketCode();
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              userId: txn.userId,
              isListed: false,
              code: newCode,
              resalePrice: null,
              resaleCount: { increment: 1 },
              resaleCommission: platformCut + organizerRoyalty,
              soldTo: txn.userId,
            },
          });

          await this.initiateWithdrawal({
            customer: { email: seller.email, name: seller.name },
            amount: sellerProceeds,
            currency: 'NGN',
            destination: {
              account_number:
                `${process.env.TEST_BANK_ACCOUNT}` || ticket.accountNumber,
              bank_code: `${process.env.TEST_BANK_CODE}` || ticket.bankCode,
            },
            reference: `resale_payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            notification_url: `${process.env.NOTIFICATION_URL}`,
            narration: `Resale payout for ticket ${ticket.id}`,
            metadata: { userId: ticket.userId },
          });
        }

        // Update wallets
        await this.prisma.wallet.update({
          where: { userId: event.organizerId },
          data: { balance: { increment: totalOrganizerRoyalty } },
        });

        const platformAdmin = await this.prisma.user.findUnique({
          where: { email: process.env.ADMIN_EMAIL },
        });

        if (platformAdmin) {
          await this.prisma.wallet.upsert({
            where: { userId: platformAdmin.id },
            create: { userId: platformAdmin.id, balance: totalPlatformCut },
            update: { balance: { increment: totalPlatformCut } },
          });
        }

        // Prepare tickets for buyer email with QR codes
        const ticketDetails = tickets.map((ticket) => ({
          ticketId: ticket.id,
          code: ticket.code,
          qrData: {
            ticketId: ticket.id,
            eventId: event.id,
            userId: txn.userId,
            code: ticket.code,
            verificationCode: generateVerificationCode(
              ticket.code,
              event.id,
              txn.userId,
            ),
            timestamp: Date.now(),
          },
        }));

        // Send emails
        try {
          // Buyer email
          await this.mailService.sendTicketResaleBuyerMail(
            txn.user.email,
            txn.user.name,
            event.name,
            ticketDetails,
          );

          // Seller email (assuming all tickets belong to the same seller)
          const seller = tickets[0].user;
          await this.mailService.sendTicketResaleSellerMail(
            seller.email,
            seller.name,
            event.name,
            tickets.length,
            totalSellerProceeds,
          );

          // Organizer email
          const organizer = await this.prisma.user.findUnique({
            where: { id: event.organizerId },
          });
          if (organizer) {
            await this.mailService.sendTicketResaleOrganizerMail(
              organizer.email,
              organizer.name,
              event.name,
              tickets.length,
              totalOrganizerRoyalty,
            );
          }

          // Admin email
          if (platformAdmin) {
            await this.mailService.sendTicketResaleAdminMail(
              platformAdmin.email,
              platformAdmin.name,
              event.name,
              tickets.length,
              totalPlatformCut,
              txn.user.name,
              seller.name,
            );
          }
        } catch (err) {
          this.logger.error(`Failed to send resale emails`, err.stack);
          // Don't fail the transaction due to email error
        }

        return {
          message: 'Transaction verified and processed successfully',
          ticketIds,
        };
      }

      return {
        message: 'Transaction verified and processed successfully',
        ticketIds,
      };
    } catch (error) {
      console.error('[Verify Transaction Error]', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });

      throw new BadRequestException(
        error?.response?.data?.message ||
          error?.message ||
          'Could not verify transaction',
      );
    }
  }

  generateTicketCode(): string {
    const randomPart = randomBytes(5).toString('hex').toUpperCase();
    return `TCK-${randomPart}`;
  }

  async generateUniqueTicketCode(): Promise<string> {
    let code: string;
    let exists = true;

    do {
      code = this.generateTicketCode();
      exists =
        (await this.prisma.ticket.findUnique({ where: { code } })) !== null;
    } while (exists);

    return code;
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InitiateDto } from './dto/initiate.dto';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly paymentBaseUrl = process.env.PAYMENT_GATEWAY_URL;
  private readonly paymentSecretKey = process.env.PAYMENT_GATEWAY_TEST_SECRET;
  private logger = new Logger(PaymentService.name);

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
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
            event: true,
            tickets: { include: { ticket: true } },
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
          include: { event: true },
        });

        if (tickets.length !== ticketIds.length) {
          throw new NotFoundException('One or more tickets not found');
        }

        const event = tickets[0].event;
        if (!event) throw new NotFoundException('Event not found');

        for (const ticket of tickets) {
          const seller = await this.prisma.user.findUnique({
            where: { id: ticket.userId },
          });
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

          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              userId: txn.userId,
              isListed: false,
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
                `${process.env.TEXT_BANK_ACCOUNT}` || ticket.accountNumber,
              bank_code: `${process.env.TEXT_BANK_CODE}` || ticket.bankCode,
            },
            reference: `resale_payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            notification_url: `${process.env.NOTIFICATION_URL}`,
            narration: `Resale payout for ticket ${ticket.id}`,
            metadata: { userId: ticket.userId },
          });

          await this.prisma.wallet.update({
            where: { userId: event.organizerId },
            data: { balance: { increment: organizerRoyalty } },
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
        }
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
}

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
      // Step 1: Verify payment with third-party provider
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

      // Step 2: Fetch transaction (with event + tickets)
      this.logger.log(`Fetching transaction with reference: ${reference}`);
      const transaction = await this.prisma.transaction.findUnique({
        where: { reference },
        include: {
          event: true,
          tickets: {
            include: { ticket: true },
          },
        },
      });

      if (!transaction) throw new NotFoundException('Transaction not found');
      if (transaction.status === 'SUCCESS')
        throw new BadRequestException('Transaction already verified');

      // Step 3: Mark transaction as successful
      this.logger.log(`Marking transaction as successful: ${reference}`);
      await this.prisma.transaction.update({
        where: { reference },
        data: { status: 'SUCCESS' },
      });

      // Step 4: Extract ticket IDs from relation
      let ticketIds = transaction.tickets.map((tt) => tt.ticket.id);

      // Step 5: Primary ticket purchase flow
      if (transaction.type === 'PRIMARY') {
        const ticketCount =
          ticketIds.length ||
          (transaction?.event?.price
            ? Math.floor(transaction.amount / transaction.event.price)
            : 0);

        // Create and attach tickets if none already created
        if (ticketIds.length === 0) {
          const newTicketIds: string[] = [];
          for (let i = 0; i < ticketCount; i++) {
            const ticketData: any = {
              userId: transaction.userId,
            };
            if (transaction.eventId) {
              ticketData.eventId = transaction.eventId;
            }
            const ticket = await this.prisma.ticket.create({
              data: ticketData,
            });
            newTicketIds.push(ticket.id);
          }

          // Attach tickets to the transaction
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

        // Update event minted count
        if (!transaction.eventId) {
          throw new NotFoundException('Event ID not found for transaction');
        }
        await this.prisma.event.update({
          where: { id: transaction.eventId },
          data: { minted: { increment: ticketIds.length } },
        });

        // Calculate platform cut and organizer proceeds
        if (!transaction.event) {
          throw new NotFoundException('Event not found for transaction');
        }
        const platformCut = Math.floor(
          (transaction.amount * transaction.event.primaryFeeBps) / 10000,
        );
        const organizerProceeds = transaction.amount - platformCut;

        // Pay organizer
        let organizerWallet = await this.prisma.wallet.findUnique({
          where: { userId: transaction.event.organizerId },
        });

        if (!organizerWallet) {
          organizerWallet = await this.prisma.wallet.create({
            data: { userId: transaction.event.organizerId, balance: 0 },
          });
        }

        await this.prisma.wallet.update({
          where: { userId: transaction.event.organizerId },
          data: { balance: { increment: organizerProceeds } },
        });

        // Pay platform admin
        const platformAdmin = await this.prisma.user.findUnique({
          where: { email: 'kareola960@gmail.com' },
        });

        if (platformAdmin) {
          let adminWallet = await this.prisma.wallet.findUnique({
            where: { userId: platformAdmin.id },
          });

          if (!adminWallet) {
            adminWallet = await this.prisma.wallet.create({
              data: { userId: platformAdmin.id, balance: 0 },
            });
          }

          await this.prisma.wallet.update({
            where: { userId: platformAdmin.id },
            data: { balance: { increment: platformCut } },
          });
        }
      }

      // Step 6: Resale purchase flow
      else if (transaction.type === 'RESALE') {
        if (!ticketIds.length)
          throw new BadRequestException(
            'No ticket IDs found for resale transaction',
          );

        const tickets = await this.prisma.ticket.findMany({
          where: { id: { in: ticketIds } },
          include: { event: true },
        });

        if (tickets.length !== ticketIds.length) {
          throw new NotFoundException('One or more tickets not found');
        }

        const event = tickets[0].event;
        if (!event) throw new NotFoundException('Event not found');

        // Process each resale ticket
        for (const ticket of tickets) {
          const resalePrice = ticket.resalePrice!;
          const platformCut = Math.floor(
            (resalePrice * event.resaleFeeBps) / 10000,
          );
          const organizerRoyalty = Math.floor(
            (resalePrice * event.royaltyFeeBps) / 10000,
          );
          const sellerProceeds = resalePrice - (platformCut + organizerRoyalty);

          // Transfer ticket to buyer
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              userId: transaction.userId,
              isListed: false,
              resalePrice: null,
              resaleCount: { increment: 1 },
              resaleCommission: platformCut + organizerRoyalty,
              soldTo: transaction.userId,
            },
          });

          // Pay seller
          await this.prisma.wallet.update({
            where: { userId: ticket.userId },
            data: { balance: { increment: sellerProceeds } },
          });

          // Pay organizer royalty
          await this.prisma.wallet.update({
            where: { userId: event.organizerId },
            data: { balance: { increment: organizerRoyalty } },
          });

          // Pay platform cut
          const platformAdmin = await this.prisma.user.findUnique({
            where: { email: 'kareola960@gmail.com' },
          });

          if (platformAdmin) {
            await this.prisma.wallet.update({
              where: { userId: platformAdmin.id },
              data: { balance: { increment: platformCut } },
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

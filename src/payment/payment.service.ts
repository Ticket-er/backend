import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InitiateDto } from './dto/initiate.dto';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly paymentBaseUrl = process.env.PAYMENT_GATEWAY_URL;
  private readonly paymentSecretKey = process.env.PAYMENT_GATEWAY_TEST_SECRET;

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  async initiatePayment(data: InitiateDto): Promise<string> {
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
  }

  async verifyTransaction(reference: string) {
    try {
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

      const transaction = await this.prisma.transaction.findUnique({
        where: { reference },
        include: { event: true, ticket: true },
      });

      if (!transaction) throw new NotFoundException('Transaction not found');
      // if (transaction.status === 'SUCCESS')
      //   throw new BadRequestException('Transaction already verified');

      // Mark transaction as successful
      await this.prisma.transaction.update({
        where: { reference },
        data: { status: 'SUCCESS' },
      });

      // Primary ticket purchase flow
      if (transaction.type === 'PRIMARY') {
        await this.prisma.ticket.create({
          data: {
            userId: transaction.userId,
            eventId: transaction.eventId,
          },
        });

        await this.prisma.event.update({
          where: { id: transaction.eventId },
          data: { minted: { increment: 1 } },
        });

        const platformCut = Math.floor(
          (transaction.amount * transaction.event.primaryFeeBps) / 10000,
        ); // 5%
        const organizerProceed = Math.floor(transaction.amount - platformCut);

        await this.prisma.wallet.update({
          where: { userId: transaction.event.organizerId },
          data: { balance: { increment: organizerProceed } },
        });

        // Pay platform cut to admin account (kareola960@gmail.com)
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

      // Resale purchase flow
      else if (transaction.type === 'RESALE') {
        const ticket = await this.prisma.ticket.findUnique({
          where: { id: transaction.ticketId! },
        });

        if (!ticket) throw new NotFoundException('Ticket not found');

        const event = await this.prisma.event.findUnique({
          where: { id: ticket.eventId },
        });
        if (!event) throw new NotFoundException('Event not found');

        const resalePrice = ticket.resalePrice!;
        const platformCut = Math.floor(
          (resalePrice * event.resaleFeeBps) / 10000,
        ); // 5%
        const organizerRoyalty = Math.floor(
          (resalePrice * event.royaltyFeeBps) / 10000,
        ); // 5%
        const sellerProceeds = resalePrice - (platformCut + organizerRoyalty);

        // Transfer ticket
        await this.prisma.ticket.update({
          where: { id: transaction.ticketId! },
          data: {
            userId: transaction.userId,
            isListed: false,
            resalePrice: null,
            resaleCount: { increment: 1 },
            resaleCommission: platformCut + organizerRoyalty,
            soldTo: transaction.userId,
          },
        });

        // Pay original seller
        await this.prisma.wallet.update({
          where: { userId: ticket.userId },
          data: { balance: { increment: sellerProceeds } },
        });

        // Pay organizer royalty
        await this.prisma.wallet.update({
          where: { userId: event.organizerId },
          data: { balance: { increment: organizerRoyalty } },
        });

        // Pay platform cut to admin account (kareola960@gmail.com)
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

      return { message: 'Transaction verified and processed successfully' };
    } catch (error) {
      console.error(error);
      throw new BadRequestException(
        error?.response?.data?.message || 'Could not verify transaction',
      );
    }
  }
}

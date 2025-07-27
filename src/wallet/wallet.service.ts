import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from 'src/payment/payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async checkBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return { balance: wallet.balance };
  }

  async withdraw(
    userId: string,
    payload: {
      email: string;
      name: string;
      pin: string;
      amount: number;
      account_number: string;
      bank_code: string;
      narration?: string;
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.role === 'USER')
        throw new BadRequestException(
          'Users cannot withdraw funds...buy a ticket instead',
        );
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (!wallet.pin) {
        throw new BadRequestException(
          'PIN not set. Please set your wallet PIN before withdrawing.',
        );
      }

      const isPinValid = await bcrypt.compare(payload.pin, wallet.pin);
      if (!isPinValid) {
        throw new BadRequestException('Invalid PIN provided.');
      }

      if (wallet.balance.lt(payload.amount)) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const reference = `withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Call the payment service to hit the aggregator
      const payoutResult = await this.paymentService.initiateWithdrawal({
        customer: {
          email: payload.email,
          name: payload.name,
        },
        amount: payload.amount,
        currency: 'NGN',
        destination: {
          account_number: payload.account_number,
          bank_code: payload.bank_code,
        },
        reference,
        notification_url: `${process.env.NOTIFICATION_URL}`,
        narration: payload.narration || 'Wallet withdrawal',
        metadata: { userId },
      });

      // Deduct funds after aggregator call success
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: payload.amount } },
      });

      return {
        message: 'Withdrawal initiated successfully',
        reference,
        payout: payoutResult,
      };
    });
  }

  async getTransactions(organizerId: string) {
    // Verify organizer exists and get their wallet
    const user = await this.prisma.user.findUnique({
      where: { id: organizerId },
      include: {
        wallet: true,
        events: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Organizer not found');
    }

    if (!user.wallet) {
      throw new NotFoundException('Organizer wallet not found');
    }

    if (
      user.role !== 'ORGANIZER' &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPERADMIN'
    ) {
      throw new ForbiddenException('User is not an organizer');
    }

    // Get event IDs for events created by this organizer
    const eventIds = user.events.map((event) => event.id);

    // Fetch transactions related to the organizer's events (purchases and resales)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          // Transactions for events organized by this user (purchases or resales)
          {
            eventId: {
              in: eventIds,
            },
            type: {
              in: ['PURCHASE', 'RESALE'],
            },
            status: 'SUCCESS',
          },
          // Withdrawals from the organizer's wallet
          {
            userId: organizerId,
            type: 'WITHDRAW',
            status: {
              in: ['SUCCESS', 'FAILED'],
            },
          },
        ],
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        type: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            resaleFeeBps: true, // Include resaleFeeBps for calculating platform fee
          },
        },
        tickets: {
          select: {
            ticket: {
              select: {
                id: true,
                code: true,
                event: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map transactions to a clean response format
    return transactions.map((tx) => ({
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      amount:
        tx.type === 'RESALE'
          ? Math.round((tx.amount * (tx.event?.resaleFeeBps ?? 500)) / 10000)
          : tx.amount, // 5% for RESALE, full amount otherwise
      status: tx.status,
      createdAt: tx.createdAt,
      buyer: tx.type !== 'WITHDRAW' ? tx.user : null, // Buyer info for purchases/resales, null for withdrawals
      event: tx.event ?? null, // Event info for purchases/resales, null for withdrawals
      tickets: tx.tickets.map((t) => ({
        id: t.ticket.id,
        code: t.ticket.code,
        event: t.ticket.event,
      })),
    }));
  }
}

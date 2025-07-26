import {
  BadRequestException,
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

  async getTransactions(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      include: {
        tickets: {
          include: {
            ticket: {
              include: {
                event: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions;
  }

  //GET TRANSACTIONS
  //PAY FOR TICKET WITH WALLET IN FUTURE VERSIONS
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from 'src/payment/payment.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async addFunds(userId: string, amount: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });

    return { message: 'Wallet funded successfully', amount };
  }

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
      amount: number;
      account_number: string;
      bank_code: string;
      narration?: string;
    },
  ) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

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
    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: payload.amount } },
    });

    return {
      message: 'Withdrawal initiated successfully',
      reference,
      payout: payoutResult,
    };
  }
}

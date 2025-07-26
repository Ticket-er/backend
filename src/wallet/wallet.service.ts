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

  async createWallet(userId: string, rawPin?: string) {
    const existingWallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (existingWallet) {
      throw new BadRequestException('Wallet already exists');
    }

    let hashedPin: string | undefined = undefined;
    if (rawPin) {
      const salt = await bcrypt.genSalt(10);
      hashedPin = await bcrypt.hash(rawPin, salt);
    }

    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        pin: hashedPin,
      },
    });

    return {
      message: 'Wallet created successfully',
      walletId: wallet.id,
    };
  }

  async addFunds(userId: string, amount: number, clientPage: string) {
    // Step 1: Validate wallet
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    // Step 2: Generate unique transaction reference
    const reference = `fund_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Step 3: Fetch user for payment metadata
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Step 4: Create pending transaction (type: WITHDRAW)
    await this.prisma.transaction.create({
      data: {
        reference,
        userId,
        eventId: null,
        amount,
        status: 'PENDING',
        type: 'FUND',
      },
    });

    // Step 5: Call the payment aggregator
    const checkoutUrl = await this.paymentService.initiatePayment({
      customer: {
        email: user.email,
        name: user.name,
      },
      amount,
      currency: 'NGN',
      reference,
      processor: 'kora',
      redirect_url: `${process.env.FRONTEND_URL}` + clientPage,
      notification_url: `${process.env.NOTIFICATION_URL}`,
      narration: 'Wallet top-up',
      metadata: {
        action: 'fund_wallet',
        userId,
      },
    });

    if (!checkoutUrl) {
      // Rollback
      await this.prisma.transaction.updateMany({
        where: { reference },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Failed to generate checkout link');
    }

    // Step 6: Return checkout URL
    return { checkoutUrl };
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
      pin: string;
      amount: number;
      account_number: string;
      bank_code: string;
      narration?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'USER')
      throw new BadRequestException(
        'Users cannot withdraw funds...buy a ticket instead',
      );
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
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

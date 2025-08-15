import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { InitiateDto } from './dto/initiate.dto';
import { randomBytes } from 'crypto';
import { generateVerificationCode } from 'src/common/utils/qrCode.utils';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paymentBaseUrl = process.env.PAYMENT_GATEWAY_URL;
  private readonly paymentSecretKey = process.env.PAYMENT_GATEWAY_TEST_SECRET;

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // Private Helpers
  private async callPaymentGateway<T>(
    method: 'get' | 'post',
    url: string,
    data?: any,
  ): Promise<T> {
    try {
      const response = await this.httpService.axiosRef[method](url, data, {
        headers: { Authorization: `Bearer ${this.paymentSecretKey}` },
      });
      return response?.data;
    } catch (error) {
      this.logger.error(`Payment gateway error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        error?.response?.data?.message || 'Payment gateway request failed',
      );
    }
  }

  private async findAndLockTransaction(reference: string) {
    return this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findUnique({
        where: { reference },
        include: {
          event: { include: { organizer: true } },
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
  }

  private async updateEventMintedCount(eventId: string, ticketCount: number) {
    await this.prisma.event.update({
      where: { id: eventId },
      data: { minted: { increment: ticketCount } },
    });
  }

  private async updateWalletBalance(userId: string, amount: number) {
    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    });
  }

  private async upsertPlatformAdminWallet(adminId: string, amount: number) {
    await this.prisma.wallet.upsert({
      where: { userId: adminId },
      create: { userId: adminId, balance: amount },
      update: { balance: { increment: amount } },
    });
  }

  private async createTicketsForPurchase(
    txn: any,
    ticketCount: number,
  ): Promise<string[]> {
    const ticketIds: string[] = [];
    for (let i = 0; i < ticketCount; i++) {
      const ticket = await this.prisma.ticket.create({
        data: {
          userId: txn.userId,
          eventId: txn.eventId,
          code: await this.generateUniqueTicketCode(),
        },
      });
      ticketIds.push(ticket.id);
    }
    return ticketIds;
  }

  private async linkTicketsToTransaction(
    reference: string,
    ticketIds: string[],
  ) {
    await this.prisma.transaction.update({
      where: { reference },
      data: {
        tickets: {
          create: ticketIds.map((id) => ({ ticket: { connect: { id } } })),
        },
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async generateTicketDetails(
    tickets: any[],
    eventId: string,
    userId: string,
  ) {
    const ticketDetails = tickets.map((ticket) => {
      if (!ticket.code)
        throw new BadRequestException(`Ticket ${ticket.id} missing code`);
      return {
        ticketId: ticket.id,
        code: ticket.code,
        qrData: {
          ticketId: ticket.id,
          eventId,
          userId,
          code: ticket.code,
          verificationCode: generateVerificationCode(
            ticket.code,
            eventId,
            userId,
          ),
          timestamp: Date.now(),
        },
      };
    });

    return ticketDetails;
  }

  private async sendPurchaseEmails(
    txn: any,
    ticketDetails: any[],
    platformCut: number,
  ) {
    try {
      const platformAdmin = await this.prisma.user.findUnique({
        where: { email: process.env.ADMIN_EMAIL },
      });

      await Promise.all([
        this.mailService.sendTicketPurchaseBuyerMail(
          txn.user.email,
          txn.user.name,
          txn.event.name,
          ticketDetails,
        ),
        this.mailService.sendTicketPurchaseOrganizerMail(
          txn.event.organizer.email,
          txn.event.organizer.name,
          txn.event.name,
          ticketDetails.length,
          txn.amount - platformCut,
        ),
        platformAdmin &&
          this.mailService.sendTicketPurchaseAdminMail(
            platformAdmin.email,
            platformAdmin.name,
            txn.event.name,
            ticketDetails.length,
            platformCut,
            txn.user.name,
          ),
      ]);
    } catch (err) {
      this.logger.error(`Failed to send purchase emails`, err.stack);
    }
  }

  private async processPurchaseFlow(txn: any, ticketIds: string[]) {
    if (!txn.eventId || !txn.event) {
      throw new NotFoundException(
        'Event data missing for purchase transaction',
      );
    }

    const ticketCount =
      ticketIds.length ||
      (txn.event?.price ? Math.floor(txn.amount / txn.event.price) : 0);
    if (ticketCount === 0)
      throw new BadRequestException('No tickets to process');

    if (ticketIds.length === 0) {
      ticketIds = await this.createTicketsForPurchase(txn, ticketCount);
      await this.linkTicketsToTransaction(txn.reference, ticketIds);
    }

    await this.updateEventMintedCount(txn.eventId, ticketIds.length);

    const platformCut = Math.floor(
      (txn.amount * txn.event.primaryFeeBps) / 10000,
    );
    const organizerProceeds = txn.amount - platformCut;

    await this.updateWalletBalance(txn.event.organizerId, organizerProceeds);

    const platformAdmin = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL },
    });
    if (platformAdmin) {
      await this.upsertPlatformAdminWallet(platformAdmin.id, platformCut);
    }

    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
    });
    const ticketDetails = await this.generateTicketDetails(
      tickets,
      txn.eventId,
      txn.userId,
    );

    await this.sendPurchaseEmails(txn, ticketDetails, platformCut);

    return ticketIds;
  }

  private async sendResaleEmails(
    txn: any,
    tickets: any[],
    platformCut: number,
    organizerRoyalty: number,
    sellerProceeds: number,
  ) {
    try {
      const platformAdmin = await this.prisma.user.findUnique({
        where: { email: process.env.ADMIN_EMAIL },
      });
      const organizer = await this.prisma.user.findUnique({
        where: { id: tickets[0].event.organizerId },
      });
      const seller = tickets[0].user;

      await Promise.all([
        this.mailService.sendTicketResaleBuyerMail(
          txn.user.email,
          txn.user.name,
          tickets[0].event.name,
          await this.generateTicketDetails(
            tickets,
            tickets[0].event.id,
            txn.userId,
          ),
        ),
        this.mailService.sendTicketResaleSellerMail(
          seller.email,
          seller.name,
          tickets[0].event.name,
          tickets.length,
          sellerProceeds,
        ),
        organizer &&
          this.mailService.sendTicketResaleOrganizerMail(
            organizer.email,
            organizer.name,
            tickets[0].event.name,
            tickets.length,
            organizerRoyalty,
          ),
        platformAdmin &&
          this.mailService.sendTicketResaleAdminMail(
            platformAdmin.email,
            platformAdmin.name,
            tickets[0].event.name,
            tickets.length,
            platformCut,
            txn.user.name,
            seller.name,
          ),
      ]);
    } catch (err) {
      this.logger.error(`Failed to send resale emails`, err.stack);
    }
  }

  private async processResaleFlow(txn: any, ticketIds: string[]) {
    if (!ticketIds.length)
      throw new BadRequestException(
        'No ticket IDs found for resale transaction',
      );

    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: ticketIds } },
      include: { event: true, user: true },
    });
    if (tickets.length !== ticketIds.length)
      throw new NotFoundException('One or more tickets not found');

    const event = tickets[0].event;
    if (!event) throw new NotFoundException('Event not found');

    let totalPlatformCut = 0;
    let totalOrganizerRoyalty = 0;
    let totalSellerProceeds = 0;

    for (const ticket of tickets) {
      const seller = ticket.user;
      if (!seller)
        throw new NotFoundException(`Seller not found for ticket ${ticket.id}`);

      if (!ticket.resalePrice || !ticket.accountNumber || !ticket.bankCode) {
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
          account_number: process.env.TEST_BANK_ACCOUNT || ticket.accountNumber,
          bank_code: process.env.TEST_BANK_CODE || ticket.bankCode,
        },
        reference: `resale_payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        notification_url: process.env.NOTIFICATION_URL,
        narration: `Resale payout for ticket ${ticket.id}`,
        metadata: { userId: ticket.userId },
      });
    }

    await this.updateWalletBalance(event.organizerId, totalOrganizerRoyalty);

    const platformAdmin = await this.prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL },
    });
    if (platformAdmin) {
      await this.upsertPlatformAdminWallet(platformAdmin.id, totalPlatformCut);
    }

    await this.sendResaleEmails(
      txn,
      tickets,
      totalPlatformCut,
      totalOrganizerRoyalty,
      totalSellerProceeds,
    );

    return ticketIds;
  }

  // Payment Initiation
  async initiatePayment(data: InitiateDto): Promise<string> {
    this.logger.log(
      `Initiating payment with data: ${JSON.stringify(data, null, 2)}`,
    );
    const response = await this.callPaymentGateway<{ checkout_url?: string }>(
      'post',
      `${this.paymentBaseUrl}/api/v1/initiate`,
      data,
    );
    if (!response.checkout_url)
      throw new BadRequestException('Failed to initiate payment');
    return response.checkout_url;
  }

  async initiateWithdrawal(data: any): Promise<any> {
    this.logger.log(
      `Initiating withdrawal with data: ${JSON.stringify(data, null, 2)}`,
    );
    const response = await this.callPaymentGateway(
      'post',
      `${this.paymentBaseUrl}/api/v1/payout`,
      data,
    );
    return response ?? null;
  }

  // Transaction Verification
  async verifyTransaction(reference: string) {
    this.logger.log(`Verifying transaction with reference: ${reference}`);

    const { status, message } = await this.callPaymentGateway<{
      status: boolean;
      message: string;
    }>(
      'get',
      `${this.paymentBaseUrl}/api/v1/transactions/verify?reference=${reference}`,
    );
    if (!status || message !== 'verification successful') {
      throw new BadRequestException('Transaction verification failed');
    }

    const { alreadyProcessed, txn } =
      await this.findAndLockTransaction(reference);
    if (alreadyProcessed) {
      return { message: 'Already verified', success: true };
    }

    const ticketIds = txn.tickets
      .filter((tt) => tt.ticket?.id)
      .map((tt) => tt.ticket.id);

    if (txn.type === 'PURCHASE') {
      await this.processPurchaseFlow(txn, ticketIds);
    } else if (txn.type === 'RESALE') {
      await this.processResaleFlow(txn, ticketIds);
    } else {
      throw new BadRequestException(`Invalid transaction type: ${txn.type}`);
    }

    return {
      message: 'Transaction verified and processed successfully',
      ticketIds,
    };
  }

  // Ticket Code Generation
  private generateTicketCode(): string {
    const randomPart = randomBytes(5).toString('hex').toUpperCase();
    return `TCK-${randomPart}`;
  }

  async generateUniqueTicketCode(): Promise<string> {
    let code: string;
    let exists = true;

    do {
      code = this.generateTicketCode();
      exists = !!(await this.prisma.ticket.findUnique({ where: { code } }));
    } while (exists);

    return code;
  }
}

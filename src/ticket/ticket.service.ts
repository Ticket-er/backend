import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuyNewDto } from './dto/buy-new.dto';
import { ListResaleDto } from './dto/list-resale.dto';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class TicketService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async buyNewTicket(dto: BuyNewDto, userId: string) {
    // Step 1: Validate event
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event || !event.isActive)
      throw new NotFoundException('Event not available');
    if (event.date < new Date())
      throw new BadRequestException('Event already passed');

    // Step 2: Validate user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Step 3: Generate unique reference
    const reference = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Step 4: Create pending transaction
    try {
      await this.prisma.transaction.create({
        data: {
          reference,
          userId,
          eventId: dto.eventId,
          type: 'PRIMARY',
          status: 'PENDING',
          amount: event.price,
        },
      });
    } catch {
      throw new BadRequestException('Failed to create transaction');
    }

    // Step 5: Attempt to initiate payment
    let checkoutUrl: string | null = null;
    try {
      const url = await this.paymentService.initiatePayment({
        customer: { email: user.email, name: user.name },
        amount: event.price,
        currency: 'NGN',
        reference,
        processor: 'kora',
        narration: `Ticket for ${event.name}`,
        metadata: {},
      });

      checkoutUrl = url;

      if (!checkoutUrl) {
        throw new Error('Missing checkout URL from payment provider');
      }
    } catch {
      // Optionally delete transaction or update to failed
      await this.prisma.transaction.updateMany({
        where: { reference },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException(
        'Payment initialization failed. Please try again.',
      );
    }

    // Step 6: Return successful checkout URL
    return { checkoutUrl };
  }

  async listForResale(ticketId: string, dto: ListResaleDto, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId)
      throw new ForbiddenException('Not your ticket');
    if (ticket.isUsed) throw new BadRequestException('Ticket already used');
    if (ticket.isListed) throw new BadRequestException('Already listed');
    if (ticket.resaleCount >= 1)
      throw new BadRequestException('Can only be resold once');

    // Check event still upcoming
    const event = await this.prisma.event.findUnique({
      where: { id: ticket.eventId },
    });
    if (event && event.date < new Date())
      throw new BadRequestException('Event already passed');

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isListed: true,
        resalePrice: dto.resalePrice,
        listedAt: new Date(),
      },
    });
  }

  async getResaleTickets(eventId?: string) {
    const where: any = { isListed: true };
    if (eventId) where.eventId = eventId;

    const resaleTickets = await this.prisma.ticket.findMany({
      where,
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true } }, // seller info
      },
      orderBy: { listedAt: 'desc' },
    });

    return resaleTickets;
  }

  async buyResaleTicket(ticketId: string, buyerId: string) {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { event: true, user: true },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket not found');
      }

      if (!ticket.isListed || ticket.resalePrice == null) {
        throw new BadRequestException('Ticket is not listed for resale');
      }

      if (ticket.userId === buyerId) {
        throw new BadRequestException('You cannot buy your own ticket');
      }

      const buyer = await this.prisma.user.findUnique({
        where: { id: buyerId },
      });

      if (!buyer) {
        throw new NotFoundException('Buyer not found');
      }

      const reference = `resale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Create transaction record
      await this.prisma.transaction.create({
        data: {
          reference,
          userId: buyerId,
          eventId: ticket.eventId,
          ticketId,
          amount: ticket.resalePrice,
          type: 'RESALE',
          status: 'PENDING',
        },
      });

      // Initiate payment
      const checkoutUrl = await this.paymentService.initiatePayment({
        customer: {
          email: buyer.email,
          name: buyer.name,
        },
        amount: ticket.resalePrice,
        currency: 'NGN',
        reference,
        processor: 'kora',
        narration: `Resale ticket for ${ticket.event.name}`,
        metadata: {},
      });

      if (!checkoutUrl) {
        // Clean up the pending transaction if no checkout was created
        await this.prisma.transaction.delete({ where: { reference } });
        throw new BadRequestException('Failed to generate payment link');
      }

      return { checkoutUrl };
    } catch (error) {
      console.error('[Buy Resale Ticket Error]', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error?.response?.data?.message ||
          'Something went wrong while buying resale ticket',
      );
    }
  }

  async getMyListings(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId, isListed: true },
      include: { event: true },
      orderBy: { listedAt: 'desc' },
    });
  }

  async getBoughtFromResale(userId: string) {
    return this.prisma.ticket.findMany({
      where: { soldTo: userId },
      include: { event: true, user: { select: { id: true, name: true } } },
      orderBy: { listedAt: 'desc' },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

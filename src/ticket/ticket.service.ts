import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuyNewDto } from './dto/buy-new.dto';
import { ListResaleDto } from './dto/list-resale.dto';
import { PaymentService } from 'src/payment/payment.service';
import { BuyResaleDto } from './dto/buy-resale.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TicketService {
  private logger = new Logger(TicketService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async verifyTicket(payload: {
    ticketId?: string;
    code?: string;
    eventId: string;
    userId: string;
  }) {
    const { ticketId, code, eventId, userId } = payload;

    if (!ticketId && !code) {
      throw new BadRequestException('Either ticketId or code is required');
    }

    // Find ticket by ID or code
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        eventId,
        ...(ticketId ? { id: ticketId } : { code }),
      },
      include: { event: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const isOrganizer = ticket.event.organizerId === userId;

    let updated = false;

    // If organizer, mark as used
    if (isOrganizer && !ticket.isUsed) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { isUsed: true },
      });
      updated = true;
    }

    return {
      ticketId: ticket.id,
      code: ticket.code,
      eventId: ticket.eventId,
      status: ticket.isUsed ? 'USED' : 'VALID',
      markedUsed: updated,
      message: ticket.isUsed
        ? 'Ticket has already been used'
        : isOrganizer
          ? 'Ticket marked as used'
          : 'Ticket is valid',
    };
  }

  async buyNewTicket(dto: BuyNewDto, userId: string) {
    this.logger.log(
      `Starting ticket purchase for event ${dto.eventId} by user ${userId}`,
    );

    // Step 1: Validate event
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event || !event.isActive) {
      this.logger.warn(`Event ${dto.eventId} not found or inactive`);
      throw new NotFoundException('Event not available');
    }
    if (event.date < new Date()) {
      this.logger.warn(`Event ${dto.eventId} already passed`);
      throw new BadRequestException('Event already passed');
    }

    // Step 2: Validate supply
    if (event.minted + dto.quantity > event.maxTickets) {
      this.logger.warn(`Not enough tickets for event ${dto.eventId}`);
      throw new BadRequestException('Not enough tickets available');
    }

    // Step 3: Validate user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      this.logger.error(`User ${userId} not found`);
      throw new NotFoundException('User not found');
    }

    // Step 4: Generate unique reference
    const reference = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Step 5: Create tickets
    const ticketIds: string[] = [];
    try {
      this.logger.log(`Creating ${dto.quantity} ticket(s) for user ${userId}`);
      for (let i = 0; i < dto.quantity; i++) {
        const code = `TCK-${randomBytes(3).toString('hex').toUpperCase()}`;
        const ticket = await this.prisma.ticket.create({
          data: {
            userId,
            eventId: dto.eventId,
            code,
          },
        });
        ticketIds.push(ticket.id);
      }
    } catch (err) {
      this.logger.error(
        `Ticket creation failed for event ${dto.eventId}`,
        err.stack,
      );
      throw new BadRequestException('Error while creating tickets');
    }

    // Step 6: Create transaction
    try {
      this.logger.log(`Creating transaction for reference ${reference}`);
      await this.prisma.transaction.create({
        data: {
          reference,
          userId,
          eventId: dto.eventId,
          type: 'PRIMARY',
          status: 'PENDING',
          amount: event.price * dto.quantity,
          tickets: {
            create: ticketIds.map((id) => ({
              ticketId: id,
            })),
          },
        },
      });
    } catch (err) {
      this.logger.error(
        `Transaction creation failed for ref ${reference}`,
        err.stack,
      );
      // Rollback tickets
      await this.prisma.ticket.deleteMany({
        where: { id: { in: ticketIds } },
      });
      throw new BadRequestException('Failed to create transaction');
    }

    // Step 7: Initiate payment
    let checkoutUrl: string | null = null;
    try {
      this.logger.log(`Initiating payment for transaction ref ${reference}`);

      checkoutUrl = await this.paymentService.initiatePayment({
        customer: { email: user.email, name: user.name },
        amount: event.price * dto.quantity,
        currency: 'NGN',
        reference,
        processor: 'kora',
        narration: `Tickets for ${event.name}`,
        notification_url: `${process.env.NOTIFICATION_URL}`,
        metadata: { ticketIds },
      });

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from payment gateway');
      }

      this.logger.log(`Payment initiated: ${checkoutUrl}`);
    } catch (err) {
      this.logger.error(
        `Payment initiation failed for ref ${reference}`,
        err.stack,
      );

      // Mark transaction as failed
      await this.prisma.transaction.updateMany({
        where: { reference },
        data: { status: 'FAILED' },
      });

      // Delete ticket associations
      await this.prisma.transactionTicket.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });

      // Delete the tickets themselves
      await this.prisma.ticket.deleteMany({
        where: { id: { in: ticketIds } },
      });

      throw new BadRequestException(
        'Payment initialization failed. Please try again.',
      );
    }

    // Step 8: Return payment URL
    return { checkoutUrl };
  }

  async buyResaleTicket(dto: BuyResaleDto, userId: string) {
    try {
      // Step 1: Validate tickets
      const tickets = await this.prisma.ticket.findMany({
        where: {
          id: { in: dto.ticketIds },
          isListed: true,
          resalePrice: { not: null },
        },
        include: { event: true, user: true },
      });

      if (tickets.length !== dto.ticketIds.length) {
        throw new NotFoundException(
          'One or more tickets not found or not listed for resale',
        );
      }

      // Step 2: Validate ticket conditions
      for (const ticket of tickets) {
        if (ticket.userId === userId) {
          throw new BadRequestException('You cannot buy your own ticket');
        }
        if (!ticket.event.isActive || ticket.event.date < new Date()) {
          throw new BadRequestException(
            `Event for ticket ${ticket.id} is not active or has passed`,
          );
        }
      }

      // Step 3: Validate buyer
      const buyer = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!buyer) throw new NotFoundException('Buyer not found');

      // Step 4: Calculate total amount
      const totalAmount = tickets.reduce(
        (sum, ticket) => sum + (ticket.resalePrice || 0),
        0,
      );

      // Step 5: Generate unique reference
      const reference = `resale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Step 6: Create transaction record
      await this.prisma.transaction.create({
        data: {
          reference,
          userId: userId,
          eventId: tickets[0].eventId,
          tickets: {
            create: tickets.map((t) => ({
              ticket: {
                connect: { id: t.id },
              },
            })),
          },
          amount: totalAmount,
          type: 'RESALE',
          status: 'PENDING',
        },
      });

      // Step 7: Initiate payment
      const checkoutUrl = await this.paymentService.initiatePayment({
        customer: {
          email: buyer.email,
          name: buyer.name,
        },
        amount: totalAmount,
        currency: 'NGN',
        reference,
        processor: 'kora',
        narration: `Resale tickets for ${tickets[0].event.name}`,
        notification_url: `${process.env.NOTIFICATION_URL}`,
        metadata: { ticketIds: dto.ticketIds },
      });

      if (!checkoutUrl) {
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
          'Something went wrong while buying resale tickets',
      );
    }
  }

  async listForResale(dto: ListResaleDto, userId: string) {
    // Step 1: Validate tickets
    const tickets = await this.prisma.ticket.findMany({
      where: {
        id: { in: dto.ticketIds },
        userId,
      },
      include: { event: true },
    });

    if (tickets.length !== dto.ticketIds.length) {
      throw new NotFoundException(
        'One or more tickets not found or not owned by user',
      );
    }

    // Step 2: Validate ticket conditions
    for (const ticket of tickets) {
      if (ticket.isUsed) {
        throw new BadRequestException(`Ticket ${ticket.id} already used`);
      }
      if (ticket.isListed) {
        throw new BadRequestException(`Ticket ${ticket.id} already listed`);
      }
      if (ticket.resaleCount >= 1) {
        throw new BadRequestException(
          `Ticket ${ticket.id} can only be resold once`,
        );
      }
      if (
        !ticket.event ||
        !ticket.event.isActive ||
        ticket.event.date < new Date()
      ) {
        throw new BadRequestException(
          `Event for ticket ${ticket.id} is not active or has passed`,
        );
      }
    }

    // Step 3: Update tickets for resale
    try {
      await this.prisma.ticket.updateMany({
        where: { id: { in: dto.ticketIds } },
        data: {
          isListed: true,
          resalePrice: dto.resalePrice,
          listedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[List Resale Tickets Error]', error);
      throw new BadRequestException('Failed to list tickets for resale');
    }

    // Step 4: Return updated tickets
    return this.prisma.ticket.findMany({
      where: { id: { in: dto.ticketIds } },
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
      where: {
        userId,
        TransactionTicket: {
          some: {
            transaction: {
              status: 'SUCCESS',
            },
          },
        },
      },
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

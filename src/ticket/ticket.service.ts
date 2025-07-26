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

  async buyNewTicket(dto: BuyNewDto, userId: string, clientPage: string) {
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

    const totalAmount = event.price * dto.quantity;
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
          amount: totalAmount + totalAmount * (5 / 100),
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
      this.logger.log(
        `Initiating payment for transaction from url ${process.env.FRONTEND_URL + clientPage} `,
      );

      if (dto.useWallet) {
        try {
          await this.payFromWallet(userId, totalAmount + totalAmount * 0.05);

          await this.prisma.transaction.update({
            where: { reference },
            data: { status: 'SUCCESS' },
          });

          // Update event.minted
          await this.prisma.event.update({
            where: { id: dto.eventId },
            data: {
              minted: {
                increment: dto.quantity,
              },
            },
          });

          return { message: 'Tickets purchased successfully via wallet' };
        } catch (walletError) {
          await this.prisma.transaction.update({
            where: { reference },
            data: { status: 'FAILED' },
          });

          await this.prisma.ticket.deleteMany({
            where: { id: { in: ticketIds } },
          });

          throw walletError;
        }
      } else {
        checkoutUrl = await this.paymentService.initiatePayment({
          customer: { email: user.email, name: user.name },
          amount: totalAmount + totalAmount * (5 / 100),
          currency: 'NGN',
          reference,
          processor: 'kora',
          narration: `Tickets for ${event.name}`,
          notification_url: `${process.env.NOTIFICATION_URL}`,
          // redirect_url: `${process.env.FRONTEND_URL}` + clientPage,
          metadata: { ticketIds },
        });
      }
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

      // Step 1.5: Ensure all tickets belong to the same event
      const eventId = tickets[0].eventId;
      const allSameEvent = tickets.every(
        (ticket) => ticket.eventId === eventId,
      );
      if (!allSameEvent) {
        throw new BadRequestException(
          'All tickets must belong to the same event',
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
          eventId,
          tickets: {
            create: tickets.map((t) => ({
              ticket: {
                connect: { id: t.id },
              },
            })),
          },
          amount: totalAmount + totalAmount * (5 / 100),
          type: 'RESALE',
          status: 'PENDING',
        },
      });

      // Step 7: Initiate payment
      let checkoutUrl: string | null = null;

      if (dto.useWallet) {
        try {
          await this.payFromWallet(userId, totalAmount + totalAmount * 0.05);

          await this.prisma.transaction.update({
            where: { reference },
            data: { status: 'SUCCESS' },
          });

          // Update tickets: new owner and remove from listing
          for (const ticket of tickets) {
            await this.prisma.ticket.update({
              where: { id: ticket.id },
              data: {
                userId,
                isListed: false,
                listedAt: null,
                resalePrice: null,
                resaleCount: { increment: 1 },
                soldTo: ticket.userId,
                resaleCommission: Math.floor(ticket.resalePrice! * 0.05),
              },
            });
          }

          return {
            message: 'Resale tickets purchased successfully via wallet',
          };
        } catch (walletError) {
          await this.prisma.transaction.update({
            where: { reference },
            data: { status: 'FAILED' },
          });

          throw walletError;
        }
      } else {
        checkoutUrl = await this.paymentService.initiatePayment({
          customer: {
            email: buyer.email,
            name: buyer.name,
          },
          amount: totalAmount + totalAmount * (5 / 100),
          currency: 'NGN',
          reference,
          processor: 'kora',
          narration: `Resale tickets for ${tickets[0].event.name}`,
          notification_url: `${process.env.NOTIFICATION_URL}`,
          // redirect_url: `${process.env.FRONTEND_URL}` + clientPage,
          metadata: { ticketIds: dto.ticketIds },
        });
      }

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

  async payFromWallet(userId: string, amount: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (wallet.balance.lt(amount)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: amount } },
    });
  }

  async listForResale(dto: ListResaleDto, userId: string) {
    const ticketId = dto.ticketId;

    // Step 1: Validate ticket
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: { event: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found or not owned by user');
    }

    // Step 2: Validate ticket conditions
    if (ticket.isUsed) {
      throw new BadRequestException(
        `Ticket ${ticket.id} has already been used`,
      );
    }

    if (ticket.isListed) {
      throw new BadRequestException(`Ticket ${ticket.id} is already listed`);
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
        `Event is not active or has already passed`,
      );
    }

    // Step 3: List ticket
    try {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          isListed: true,
          resalePrice: dto.resalePrice,
          listedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('[List Resale Ticket Error]', error);
      throw new BadRequestException('Failed to list ticket for resale');
    }

    // Step 4: Return updated ticket
    return this.prisma.ticket.findUnique({ where: { id: ticketId } });
  }

  async getResaleTickets(eventId?: string) {
    const where: any = { isListed: true, soldTo: null };
    if (eventId) where.eventId = eventId;

    const resaleTickets = await this.prisma.ticket.findMany({
      where,
      include: {
        event: true,
        user: {
          select: { id: true, name: true, email: true, profileImage: true },
        }, // seller info
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

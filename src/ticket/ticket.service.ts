/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { BuyNewDto } from './dto/buy-new.dto';
import { ListResaleDto } from './dto/list-resale.dto';
import { BuyResaleDto } from './dto/buy-resale.dto';
import { RemoveResaleDto } from './dto/remove-resale.dto';
import { TransactionStatus, TransactionType } from '@prisma/client';

@Injectable()
export class TicketService {
  private logger = new Logger(TicketService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  // ===================== Private Helpers =====================
  private async validateEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketCategories: true },
    });
    if (!event || !event.isActive) {
      this.logger.warn(`Event ${eventId} not found or inactive`);
      throw new NotFoundException('Event not available');
    }
    if (event.date < new Date()) {
      this.logger.warn(`Event ${eventId} already passed`);
      throw new BadRequestException('Event already passed');
    }
    return event;
  }

  private async validateUser(userId: string, event: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.error(`User ${userId} not found`);
      throw new NotFoundException('User not found');
    }
    if (userId === event.organizerId) {
      this.logger.warn(`Organizer ${userId} cannot buy their own tickets`);
      throw new BadRequestException('Organizer cannot buy their own tickets');
    }
    return user;
  }

  private async validateTicketCategory(
    ticketCategoryId: string,
    eventId: string,
  ) {
    const ticketCategory = await this.prisma.ticketCategory.findFirst({
      where: { id: ticketCategoryId, eventId },
    });
    if (!ticketCategory) {
      this.logger.warn(
        `Ticket category ${ticketCategoryId} not found for event ${eventId}`,
      );
      throw new NotFoundException('Ticket category not found');
    }
    return ticketCategory;
  }

  private async createTickets(
    userId: string,
    eventId: string,
    ticketCategoryId: string,
    quantity: number,
  ): Promise<string[]> {
    const ticketIds: string[] = [];
    for (let i = 0; i < quantity; i++) {
      const code = await this.paymentService.generateUniqueTicketCode();
      const ticket = await this.prisma.ticket.create({
        data: { userId, eventId, ticketCategoryId, code },
      });
      ticketIds.push(ticket.id);
    }
    return ticketIds;
  }

  private async createTransaction(
    reference: string,
    userId: string,
    eventId: string,
    amount: number,
    type: TransactionType,
    status: TransactionStatus,
    ticketIds: string[],
  ) {
    await this.prisma.transaction.create({
      data: {
        reference,
        userId,
        eventId,
        type,
        status,
        amount,
        tickets: { create: ticketIds.map((id) => ({ ticketId: id })) },
      },
    });
  }

  private async initiatePayment(
    user: any,
    event: any,
    totalAmount: number,
    reference: string,
    ticketIds: string[],
    clientPage: string,
  ): Promise<string> {
    const redirectUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}${clientPage}`
      : undefined;

    const payload = {
      customer: { email: user.email, name: user.name },
      amount: totalAmount,
      currency: 'NGN',
      reference,
      processor: 'kora',
      narration: `Tickets for ${event.name}`,
      notification_url: process.env.NOTIFICATION_URL,
      redirect_url: redirectUrl,
      metadata: { ticketIds },
    };

    this.logger.log(
      `💳 Initiating payment with payload:\n${JSON.stringify(payload, null, 2)}`,
    );

    const checkoutUrl = await this.paymentService.initiatePayment(payload);

    if (!checkoutUrl) {
      this.logger.error('❌ Payment gateway returned no checkout URL');
      throw new BadRequestException('Failed to generate payment link');
    }

    this.logger.log(`✅ Payment initiated, checkout URL: ${checkoutUrl}`);
    return checkoutUrl;
  }

  private async rollbackTransaction(reference: string, ticketIds: string[]) {
    await this.prisma.transactionTicket.deleteMany({
      where: { ticketId: { in: ticketIds } },
    });
    await this.prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await this.prisma.transaction.delete({ where: { reference } });
  }

  private validateResaleTickets(
    tickets: any[],
    ticketIds: string[],
    userId: string,
  ) {
    if (tickets.length !== ticketIds.length) {
      throw new NotFoundException(
        'One or more tickets not found or not listed for resale',
      );
    }
    const eventId = tickets[0].eventId;
    const allSameEvent = tickets.every((ticket) => ticket.eventId === eventId);
    if (!allSameEvent) {
      throw new BadRequestException(
        'All tickets must belong to the same event',
      );
    }
    for (const ticket of tickets) {
      if (ticket.userId === userId) {
        throw new BadRequestException('You cannot buy your own ticket');
      }
      if (!ticket.event.isActive || ticket.event.date < new Date()) {
        throw new BadRequestException(
          `Event for ticket ${ticket.id} is not active or has passed`,
        );
      }
      if (userId === ticket.event.organizerId) {
        this.logger.warn(`Organizer ${userId} cannot buy their own tickets`);
        throw new BadRequestException('Organizer cannot buy their own tickets');
      }
    }
    return eventId;
  }

  private async lockResaleTickets(tx: any, ticketIds: string[]) {
    await tx.ticket.updateMany({
      where: { id: { in: ticketIds } },
      data: { isListed: false },
    });
  }

  // ===================== Ticket Purchase =====================
  async buyNewTicket(dto: BuyNewDto, userId: string, clientPage: string) {
    this.logger.log(
      `Starting ticket purchase for event ${dto.eventId} by user ${userId}`,
    );

    const event = await this.validateEvent(dto.eventId);
    const user = await this.validateUser(userId, event);

    // Validate all ticket categories and calculate total amount
    const ticketCategories = await Promise.all(
      dto.ticketCategories.map(async (item) => {
        const category = await this.validateTicketCategory(
          item.ticketCategoryId,
          dto.eventId,
        );
        if (category.minted + item.quantity > category.maxTickets) {
          this.logger.warn(
            `Not enough tickets for category ${item.ticketCategoryId}`,
          );
          throw new BadRequestException(
            `Not enough tickets available in category ${category.name}`,
          );
        }
        return { ...category, quantity: item.quantity };
      }),
    );

    const totalAmount = ticketCategories.reduce(
      (sum, category) => sum + category.price * category.quantity,
      0,
    );
    const reference = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create tickets for all categories
    let ticketIds: string[] = [];
    try {
      for (const category of ticketCategories) {
        const ids = await this.createTickets(
          userId,
          dto.eventId,
          category.id,
          category.quantity,
        );
        ticketIds = ticketIds.concat(ids);
      }
    } catch (err) {
      this.logger.error(
        `Ticket creation failed for event ${dto.eventId}`,
        err.stack,
      );
      throw new BadRequestException('Error while creating tickets');
    }

    try {
      if (totalAmount === 0) {
        // Free event: Skip payment, create transaction with SUCCESS status
        await this.createTransaction(
          reference,
          userId,
          dto.eventId,
          0,
          'PURCHASE',
          'SUCCESS',
          ticketIds,
        );
        await Promise.all(
          ticketCategories.map((category) =>
            this.prisma.ticketCategory.update({
              where: { id: category.id },
              data: { minted: { increment: category.quantity } },
            }),
          ),
        );
        return {
          message: 'Free tickets created successfully',
          ticketIds,
        };
      }

      // Paid event: Create pending transaction and initiate payment
      await this.createTransaction(
        reference,
        userId,
        dto.eventId,
        totalAmount + totalAmount * 0.05,
        'PURCHASE',
        'PENDING',
        ticketIds,
      );
      const checkoutUrl = await this.initiatePayment(
        user,
        event,
        totalAmount + totalAmount * 0.05,
        reference,
        ticketIds,
        clientPage,
      );
      this.logger.log(`Payment initiated: ${checkoutUrl}`);
      return { checkoutUrl };
    } catch (err) {
      this.logger.error(
        `Payment initiation failed for ref ${reference}`,
        err.stack,
      );
      await this.rollbackTransaction(reference, ticketIds);
      throw new BadRequestException(
        'Payment initialization failed. Please try again.',
      );
    }
  }

  async buyResaleTicket(dto: BuyResaleDto, userId: string) {
    const { ticketIds } = dto;

    return this.prisma.$transaction(async (tx) => {
      const tickets = await tx.ticket.findMany({
        where: {
          id: { in: ticketIds },
          isListed: true,
          resalePrice: { not: null },
        },
        include: {
          event: true,
          user: true,
          ticketCategory: { select: { name: true, price: true } },
        },
      });

      const eventId = await this.validateResaleTickets(
        tickets,
        ticketIds,
        userId,
      );
      const buyer = await this.validateUser(userId, tickets[0].event);

      const existingTx = await tx.transaction.findFirst({
        where: {
          status: 'PENDING',
          type: 'RESALE',
          tickets: { some: { ticketId: { in: ticketIds } } },
        },
      });
      if (existingTx) {
        throw new BadRequestException(
          'Some tickets are already reserved in another transaction',
        );
      }

      const totalAmount = tickets.reduce(
        (sum, ticket) => sum + (ticket.resalePrice || 0),
        0,
      );
      const reference = `resale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      await this.lockResaleTickets(tx, ticketIds);
      try {
        await tx.transaction.create({
          data: {
            reference,
            userId,
            eventId,
            amount: totalAmount,
            type: 'RESALE',
            status: 'PENDING',
            tickets: {
              create: ticketIds.map((id) => ({ ticket: { connect: { id } } })),
            },
          },
        });

        const checkoutUrl = await this.initiatePayment(
          buyer,
          tickets[0].event,
          totalAmount,
          reference,
          ticketIds,
          '',
        );

        return { checkoutUrl };
      } catch {
        await tx.ticket.updateMany({
          where: { id: { in: ticketIds } },
          data: { isListed: true },
        });
        throw new BadRequestException('Failed to generate payment link');
      }
    });
  }

  // ===================== Resale Management =====================
  async listForResale(dto: ListResaleDto, userId: string) {
    const { ticketId, resalePrice, bankCode, accountNumber } = dto;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, userId },
        include: {
          event: true,
          ticketCategory: { select: { name: true, price: true } },
        },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket not found or not owned by user');
      }
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

      try {
        const updatedTicket = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            isListed: true,
            resalePrice,
            listedAt: new Date(),
            bankCode,
            accountNumber,
          },
        });
        return updatedTicket;
      } catch (err) {
        this.logger.error(
          `Failed to list ticket ${ticketId} for resale`,
          err.stack,
        );
        throw new BadRequestException('Failed to list ticket for resale');
      }
    });
  }

  async removeFromResale(dto: RemoveResaleDto, userId: string) {
    const { ticketId } = dto;

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({
        where: { id: ticketId, userId },
        include: {
          event: true,
          ticketCategory: { select: { name: true, price: true } },
        },
      });
      if (!ticket) {
        throw new NotFoundException('Ticket not found or not owned by user');
      }
      if (!ticket.isListed) {
        throw new BadRequestException(
          `Ticket ${ticket.id} is not listed for resale`,
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

      try {
        const updatedTicket = await tx.ticket.update({
          where: { id: ticketId },
          data: {
            isListed: false,
            resalePrice: null,
            listedAt: null,
            bankCode: null,
            accountNumber: null,
          },
        });
        return updatedTicket;
      } catch (err) {
        this.logger.error(
          `Failed to remove ticket ${ticketId} from resale`,
          err.stack,
        );
        throw new BadRequestException('Failed to remove ticket from resale');
      }
    });
  }

  // ===================== Queries =====================
  async getResaleTickets(eventId?: string) {
    const where: any = { isListed: true, soldTo: null };
    if (eventId) where.eventId = eventId;

    return this.prisma.ticket.findMany({
      where,
      include: {
        event: true,
        user: {
          select: { id: true, name: true, email: true, profileImage: true },
        },
        ticketCategory: { select: { name: true, price: true } },
      },
      orderBy: { listedAt: 'desc' },
    });
  }

  async getMyListings(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId, isListed: true },
      include: {
        event: true,
        ticketCategory: { select: { name: true, price: true } },
      },
      orderBy: { listedAt: 'desc' },
    });
  }

  async getBoughtFromResale(userId: string) {
    return this.prisma.ticket.findMany({
      where: { soldTo: userId },
      include: {
        event: true,
        user: { select: { id: true, name: true } },
        ticketCategory: { select: { name: true, price: true } },
      },
      orderBy: { listedAt: 'desc' },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.ticket.findMany({
      where: {
        userId,
        TransactionTicket: { some: { transaction: { status: 'SUCCESS' } } },
      },
      include: {
        event: true,
        ticketCategory: { select: { name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===================== Verification =====================
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

    const ticket = await this.prisma.ticket.findFirst({
      where: { eventId, ...(ticketId ? { id: ticketId } : { code }) },
      include: {
        event: true,
        ticketCategory: { select: { name: true, price: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const isOrganizer = ticket.event.organizerId === userId;
    let updated = false;

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
      ticketCategory: ticket.ticketCategory,
      status: ticket.isUsed ? 'USED' : 'VALID',
      markedUsed: updated,
      message: ticket.isUsed
        ? 'Ticket has already been used'
        : isOrganizer
          ? 'Ticket marked as used'
          : 'Ticket is valid',
    };
  }
}
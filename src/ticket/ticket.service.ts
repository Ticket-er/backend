/* eslint-disable @typescript-eslint/require-await */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BuyNewDto } from './dto/buy-new.dto';
import { ListResaleDto } from './dto/list-resale.dto';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async buyNewTicket(dto: BuyNewDto, userId: string) {
    // TODO: integrate payment gateway before creating ticket
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event || !event.isActive)
      throw new NotFoundException('Event not found or inactive');
    if (event.date < new Date())
      throw new BadRequestException('Event already passed');
    if (event.minted >= event.maxTickets)
      throw new BadRequestException('Sold out');

    // increment event.minted
    await this.prisma.event.update({
      where: { id: dto.eventId },
      data: { minted: { increment: 1 } },
    });

    return this.prisma.ticket.create({
      data: {
        userId,
        eventId: dto.eventId,
      },
    });
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
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!ticket.isListed || ticket.resalePrice == null)
      throw new BadRequestException('Ticket not for sale');
    if (ticket.userId === buyerId)
      throw new BadRequestException('Cannot buy your own ticket');

    // calculate commission & seller proceeds
    const commission = Math.floor((ticket.resalePrice * 5) / 100);
    const sellerProceeds = ticket.resalePrice - commission;

    // TODO: integrate payment gateway here:
    //  - charge buyer ticket.resalePrice
    //  - send sellerProceeds to original user
    //  - send commission to organizer (5%)

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        userId: buyerId,
        isListed: false,
        resalePrice: null,
        soldTo: buyerId,
        resaleCount: { increment: 1 },
        resaleCommission: commission,
      },
    });
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

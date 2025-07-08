import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async createEvent(dto: CreateEventDto, userId: string) {
    return this.prisma.event.create({
      data: {
        name: dto.name,
        metadataURI: dto.metadataURI,
        price: dto.price,
        maxTickets: dto.maxTickets,
        organizerId: userId,
        isActive: true,
        date: dto.date,
      },
    });
  }

  async updateEvent(id: string, dto: UpdateEventDto, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        metadataURI: dto.metadataURI,
        price: dto.price,
        maxTickets: dto.maxTickets,
        date: dto.date,
      },
    });
  }

  async toggleEventStatus(id: string, isActive: boolean, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.event.update({
      where: { id },
      data: { isActive },
    });
  }

  async getOrganizerEvents(userId: string) {
    const events = await this.prisma.event.findMany({
      where: { organizerId: userId },
      orderBy: { createdAt: 'desc' },
    });

    if (events.length === 0) {
      return { message: 'You have not created any events yet' };
    }

    return events;
  }

  async getAllEvents() {
    return this.prisma.event.findMany({
      where: { isActive: true },
      include: {
        organizer: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllEventsFiltered(query: {
    name?: string;
    from?: string;
    to?: string;
  }) {
    const filters: any = {
      isActive: true,
    };

    if (query.name) {
      filters.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.from || query.to) {
      filters.createdAt = {};
      if (query.from) filters.createdAt.gte = new Date(query.from);
      if (query.to) filters.createdAt.lte = new Date(query.to);
    }

    const events = await this.prisma.event.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { name: true, email: true } },
      },
    });

    return events;
  }

  async getUserEvents(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId },
      include: { event: true },
    });

    const grouped = tickets.reduce(
      (acc, ticket) => {
        const id = ticket.eventId;
        if (!acc[id]) {
          acc[id] = { ...ticket.event, ticketCount: 0 };
        }
        acc[id].ticketCount++;
        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped);
  }

  async getUpcomingEvents() {
    return this.prisma.event.findMany({
      where: {
        isActive: true,
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getPastEvents() {
    return this.prisma.event.findMany({
      where: {
        isActive: true,
        date: { lt: new Date() },
      },
      orderBy: { date: 'desc' },
    });
  }
}

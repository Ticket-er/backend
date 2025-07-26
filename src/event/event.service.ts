import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async createEvent(
    dto: CreateEventDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Starting event creation for user: ${userId}`);
    this.logger.debug(`DTO received: ${JSON.stringify(dto, null, 2)}`);
    if (file) {
      this.logger.log(`File received: ${file.originalname}`);
    } else {
      this.logger.warn('No file provided');
    }

    let bannerUrl: string | undefined;

    // Step 1: Handle Image Upload
    if (file) {
      try {
        const upload = await this.cloudinary.uploadImage(
          file,
          'ticket-er/events',
        );
        bannerUrl = upload;
        this.logger.log(`Image uploaded successfully: ${bannerUrl}`);
      } catch (err) {
        this.logger.error(`Image upload failed: ${err.message}`);
        throw new InternalServerErrorException('Failed to upload event banner');
      }
    }

    // Step 2: Save Event to DB
    try {
      const price = Number(dto.price);
      const maxTickets = Number(dto.maxTickets);

      const event = await this.prisma.event.create({
        data: {
          name: dto.name,
          price,
          maxTickets,
          description: dto.description || dto.name,
          organizerId: userId,
          location: dto.location || 'Not specified',
          date: dto.date,
          isActive: true,
          bannerUrl,
        },
      });

      this.logger.log(`Event created with ID: ${event.id}`);
      return event;
    } catch (err) {
      this.logger.error(`Error creating event: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  async updateEvent(
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Access denied');

    let bannerUrl = event.bannerUrl;

    if (file) {
      const upload = await this.cloudinary.uploadImage(
        file,
        'ticket-er/events',
      );
      bannerUrl = upload;
    }

    const price = Number(dto.price);
    const maxTickets = Number(dto.maxTickets);

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        name: dto.name || event.name,
        price: price ?? event.price,
        description: dto.description ?? event.description,
        maxTickets: maxTickets ?? event.maxTickets,
        location: dto.location || event.location,
        date: dto.date || event.date,
        bannerUrl,
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

  async getSingleEvent(eventId) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: { name: true, email: true, profileImage: true },
        },
        tickets: {
          where: { isListed: true },
          select: {
            id: true,
            resalePrice: true,
            listedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    return event;
  }

  async getAllEvents() {
    return this.prisma.event.findMany({
      where: { isActive: true },
      include: {
        organizer: {
          select: { name: true, email: true, profileImage: true },
        },
        tickets: {
          where: { isListed: true },
          select: {
            id: true,
            resalePrice: true,
            listedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true, // optional if you use it
              },
            },
          },
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
          acc[id] = {
            ...ticket.event,
            tickets: [],
            ticketCount: 0,
          };
        }
        acc[id].tickets.push(ticket);
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

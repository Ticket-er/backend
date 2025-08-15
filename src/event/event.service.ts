import {
  BadRequestException,
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
import slugify from 'slugify';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  // Private Helpers
  private async findEventById(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async findEventBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private validateOwnership(event: any, userId: string) {
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async uploadBannerIfProvided(
    file?: Express.Multer.File,
  ): Promise<string | undefined> {
    if (!file) return undefined;
    this.logger.log(`Uploading file: ${file.originalname}`);
    try {
      const upload = await this.cloudinary.uploadImage(file, 'ticketer/events');
      this.logger.log(`Image uploaded successfully: ${upload}`);
      return upload;
    } catch (err) {
      this.logger.error(`Image upload failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to upload event banner');
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    const exists = await this.prisma.event.findUnique({ where: { slug } });
    if (exists) {
      slug = `${baseSlug}-${Date.now().toString().slice(-5)}`;
    }
    return slug;
  }

  private async deleteBannerIfExists(bannerUrl?: string) {
    if (!bannerUrl) return;
    try {
      await this.cloudinary.deleteImage(bannerUrl);
    } catch (err) {
      this.logger.warn(
        `Failed to delete banner from Cloudinary: ${err.message}`,
      );
    }
  }

  private async checkIfTicketsExist(eventId: string): Promise<void> {
    const ticketsCount = await this.prisma.ticket.count({ where: { eventId } });
    if (ticketsCount > 0) {
      throw new BadRequestException(
        'Event cannot be deleted because tickets have already been purchased',
      );
    }
  }

  // Creation and Updates
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

    const bannerUrl = await this.uploadBannerIfProvided(file);
    const slug = await this.generateUniqueSlug(dto.name);

    try {
      const price = Number(dto.price);
      const maxTickets = Number(dto.maxTickets);

      const event = await this.prisma.event.create({
        data: {
          name: dto.name,
          price,
          maxTickets,
          slug,
          description: dto.description || dto.name,
          organizerId: userId,
          location: dto.location || 'Not specified',
          date: dto.date,
          category: dto.category,
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
    const event = await this.findEventById(eventId);
    this.validateOwnership(event, userId);

    let bannerUrl: string | undefined;

    if (file) {
      bannerUrl = await this.uploadBannerIfProvided(file);
    } else if (event.bannerUrl) {
      bannerUrl = event.bannerUrl;
    }

    const price = dto.price !== undefined ? Number(dto.price) : event.price;
    const maxTickets =
      dto.maxTickets !== undefined ? Number(dto.maxTickets) : event.maxTickets;

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        name: dto.name || event.name,
        price,
        description: dto.description ?? event.description,
        maxTickets,
        location: dto.location || event.location,
        date: dto.date || event.date,
        category: dto.category || event.category,
        bannerUrl,
      },
    });
  }

  // Status Management
  async toggleEventStatus(id: string, isActive: boolean, userId: string) {
    const event = await this.findEventById(id);
    this.validateOwnership(event, userId);

    return this.prisma.event.update({
      where: { id },
      data: { isActive },
    });
  }

  // Deletion
  async deleteEvent(id: string, userId: string) {
    const event = await this.findEventById(id);
    this.validateOwnership(event, userId);
    await this.checkIfTicketsExist(id);
    await this.deleteBannerIfExists(event.bannerUrl!);

    await this.prisma.event.delete({ where: { id } });

    return { message: 'Event deleted successfully', eventId: id };
  }

  // Queries
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

  async getSingleEvent(eventId: string) {
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

  async getEventBySlug(slug: string) {
    return this.findEventBySlug(slug);
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
                profileImage: true,
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
    const filters: any = { isActive: true };

    if (query.name) {
      filters.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.from || query.to) {
      filters.createdAt = {};
      if (query.from) filters.createdAt.gte = new Date(query.from);
      if (query.to) filters.createdAt.lte = new Date(query.to);
    }

    return this.prisma.event.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { name: true, email: true } },
      },
    });
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

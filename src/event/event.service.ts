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
import { CacheHelper } from '../common/cache/cache.helper';
import { QueueHelper } from '../common/queue/queue.helper';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import slugify from 'slugify';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private cacheHelper: CacheHelper,
    private queueHelper: QueueHelper,
  ) {}

  async createEvent(
    dto: CreateEventDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Starting event creation for user: ${userId}`);

    let bannerUrl: string | undefined;

    // Step 1: Enqueue image upload if file exists
    if (file) {
      const fileId = `${userId}-${Date.now()}`;
      await this.queueHelper.enqueue('upload-image', {
        file,
        folder: 'ticketer/events',
        fileId,
      });
      // Store fileId to retrieve bannerUrl later (cache or DB)
      await this.cacheHelper.set(
        `upload:${fileId}`,
        { status: 'pending' },
        { ttl: 300 },
      );
    }

    // Step 2: Create event in a transaction
    try {
      const price = Number(dto.price);
      const maxTickets = Number(dto.maxTickets);
      const baseSlug = slugify(dto.name, { lower: true, strict: true });

      const event = await this.prisma.$transaction(async (tx) => {
        // Check for slug uniqueness
        let slug = baseSlug;
        const exists = await tx.event.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (exists) {
          slug = `${baseSlug}-${Date.now().toString().slice(-5)}`;
        }

        return tx.event.create({
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
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
            organizerId: true,
          },
        });
      });

      // Cache event
      await this.cacheHelper.set(`event:id:${event.id}`, event, { ttl: 3600 });
      await this.cacheHelper.set(`event:slug:${event.slug}`, event, {
        ttl: 3600,
      });

      return event;
    } catch (err) {
      this.logger.error(
        `Error while creating event: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to create event');
    }
  }

  async updateEvent(
    eventId: string,
    dto: UpdateEventDto,
    userId: string,
    file?: Express.Multer.File,
  ) {
    const event = await this.cacheHelper.getOrSet(
      eventId,
      async () =>
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            organizerId: true,
            bannerUrl: true,
            name: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            slug: true,
          },
        }),
      { keyPrefix: 'event:id:', ttl: 3600 },
    );

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Access denied');

    const bannerUrl = event.bannerUrl;
    if (file) {
      const fileId = `${userId}-${Date.now()}`;
      await this.queueHelper.enqueue('upload-image', {
        file,
        folder: 'ticketer/events',
        fileId,
      });
      await this.cacheHelper.set(
        `upload:${fileId}`,
        { status: 'pending' },
        { ttl: 300 },
      );
    }

    const price = dto.price !== undefined ? Number(dto.price) : event.price;
    const maxTickets =
      dto.maxTickets !== undefined ? Number(dto.maxTickets) : event.maxTickets;

    const updatedEvent = await this.prisma.event.update({
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
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        maxTickets: true,
        description: true,
        location: true,
        date: true,
        category: true,
        isActive: true,
        bannerUrl: true,
        organizerId: true,
      },
    });

    // Update cache
    await this.cacheHelper.set(`event:id:${eventId}`, updatedEvent, {
      ttl: 3600,
    });
    await this.cacheHelper.set(
      `event:slug:${updatedEvent.slug}`,
      updatedEvent,
      { ttl: 3600 },
    );

    return updatedEvent;
  }

  async toggleEventStatus(id: string, isActive: boolean, userId: string) {
    const event = await this.cacheHelper.getOrSet(
      id,
      async () =>
        this.prisma.event.findUnique({
          where: { id },
          select: { id: true, organizerId: true, isActive: true },
        }),
      { keyPrefix: 'event:id:', ttl: 3600 },
    );

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Access denied');

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true, slug: true },
    });

    // Update cache
    await this.cacheHelper.set(`event:id:${id}`, updatedEvent, { ttl: 3600 });
    await this.cacheHelper.set(
      `event:slug:${updatedEvent.slug}`,
      updatedEvent,
      { ttl: 3600 },
    );

    return updatedEvent;
  }

  async deleteEvent(id: string, userId: string) {
    const event = await this.cacheHelper.getOrSet(
      id,
      async () =>
        this.prisma.event.findUnique({
          where: { id },
          select: { id: true, organizerId: true, bannerUrl: true, slug: true },
        }),
      { keyPrefix: 'event:id:', ttl: 3600 },
    );

    if (!event) throw new NotFoundException('Event not found');
    if (event.organizerId !== userId)
      throw new ForbiddenException('Access denied');

    await this.prisma.$transaction(async (tx) => {
      const ticketsCount = await tx.ticket.count({ where: { eventId: id } });
      if (ticketsCount > 0) {
        throw new BadRequestException(
          'Event cannot be deleted because tickets have already been purchased',
        );
      }

      await tx.event.delete({ where: { id } });
    });

    // Enqueue banner deletion
    if (event.bannerUrl) {
      await this.queueHelper.enqueue('delete-image', {
        imageUrl: event.bannerUrl,
      });
    }

    // Invalidate cache
    await this.cacheHelper.invalidate(`event:id:${id}`);
    await this.cacheHelper.invalidate(`event:slug:${event.slug}`);
    await this.cacheHelper.invalidate(`events:organizer:${userId}`);

    return { message: 'Event deleted successfully', eventId: id };
  }

  async getOrganizerEvents(userId: string) {
    const events = await this.cacheHelper.getOrSet(
      userId,
      async () =>
        this.prisma.event.findMany({
          where: { organizerId: userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
          },
        }),
      { keyPrefix: 'events:organizer:', ttl: 3600 },
    );

    if (events.length === 0) {
      return { message: 'You have not created any events yet' };
    }

    return events;
  }

  async getSingleEvent(eventId: string) {
    const event = await this.cacheHelper.getOrSet(
      eventId,
      async () =>
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
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
        }),
      { keyPrefix: 'event:id:', ttl: 3600 },
    );

    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async getEventBySlug(slug: string) {
    const event = await this.cacheHelper.getOrSet(
      slug,
      async () =>
        this.prisma.event.findUnique({
          where: { slug },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
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
        }),
      { keyPrefix: 'event:slug:', ttl: 3600 },
    );

    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async getAllEvents() {
    return this.cacheHelper.getOrSet(
      'all',
      async () =>
        this.prisma.event.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
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
        }),
      { keyPrefix: 'events:', ttl: 3600 },
    );
  }

  async getAllEventsFiltered(query: {
    name?: string;
    from?: string;
    to?: string;
  }) {
    const cacheKey = `filtered:${JSON.stringify(query)}`;
    return this.cacheHelper.getOrSet(
      cacheKey,
      async () => {
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
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
            organizer: { select: { name: true, email: true } },
          },
        });
      },
      { keyPrefix: 'events:', ttl: 300 },
    );
  }

  async getUserEvents(userId: string) {
    const events = await this.cacheHelper.getOrSet(
      userId,
      async () => {
        const tickets = await this.prisma.ticket.findMany({
          where: { userId },
          select: {
            eventId: true,
            id: true,
            resalePrice: true,
            listedAt: true,
            event: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                maxTickets: true,
                description: true,
                location: true,
                date: true,
                category: true,
                isActive: true,
                bannerUrl: true,
              },
            },
          },
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
            acc[id].tickets.push({
              id: ticket.id,
              resalePrice: ticket.resalePrice,
              listedAt: ticket.listedAt,
            });
            acc[id].ticketCount++;
            return acc;
          },
          {} as Record<string, any>,
        );

        return Object.values(grouped);
      },
      { keyPrefix: 'user:events:', ttl: 3600 },
    );

    return events;
  }

  async getUpcomingEvents() {
    return this.cacheHelper.getOrSet(
      'upcoming',
      async () =>
        this.prisma.event.findMany({
          where: {
            isActive: true,
            date: { gte: new Date() },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
          },
          orderBy: { date: 'asc' },
        }),
      { keyPrefix: 'events:', ttl: 3600 },
    );
  }

  async getPastEvents() {
    return this.cacheHelper.getOrSet(
      'past',
      async () =>
        this.prisma.event.findMany({
          where: {
            isActive: true,
            date: { lt: new Date() },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            maxTickets: true,
            description: true,
            location: true,
            date: true,
            category: true,
            isActive: true,
            bannerUrl: true,
          },
          orderBy: { date: 'desc' },
        }),
      { keyPrefix: 'events:', ttl: 3600 },
    );
  }
}

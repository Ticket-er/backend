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
      include: { ticketCategories: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private async findEventBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: { ticketCategories: true },
    });
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

    if (!dto.ticketCategories || dto.ticketCategories.length === 0) {
      throw new BadRequestException('At least one ticket category is required');
    }

    const bannerUrl = await this.uploadBannerIfProvided(file);
    const slug = await this.generateUniqueSlug(dto.name);

    try {
      const event = await this.prisma.event.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description || dto.name,
          organizerId: userId,
          location: dto.location || 'Not specified',
          date: dto.date,
          category: dto.category,
          isActive: true,
          bannerUrl,
          ticketCategories: {
            create: dto.ticketCategories.map((category) => ({
              name: category.name,
              price: Number(category.price),
              maxTickets: Number(category.maxTickets),
            })),
          },
        },
        include: { ticketCategories: true },
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

    const data: any = {
      name: dto.name || event.name,
      description: dto.description ?? event.description,
      location: dto.location || event.location,
      date: dto.date || event.date,
      category: dto.category || event.category,
      bannerUrl,
    };

    if (dto.ticketCategories) {
      // Validate that all provided categories exist
      for (const category of dto.ticketCategories) {
        const existingCategory = event.ticketCategories.find(
          (cat) => cat.id === category.id || cat.name === category.name,
        );
        if (!existingCategory) {
          throw new BadRequestException(
            `Ticket category with ID ${category.id || 'unknown'} or name ${category.name || 'unknown'} does not exist`,
          );
        }
        if (existingCategory.minted > category.maxTickets) {
          throw new BadRequestException(
            `Cannot reduce maxTickets for category ${existingCategory.name} below minted tickets (${existingCategory.minted})`,
          );
        }
      }

      // Update existing categories
      data.ticketCategories = {
        update: dto.ticketCategories.map((category) => ({
          where: {
            id:
              category.id ||
              event.ticketCategories.find((cat) => cat.name === category.name)
                ?.id,
          },
          data: {
            price: Number(category.price),
            maxTickets: Number(category.maxTickets),
          },
        })),
      };
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data,
      include: { ticketCategories: true },
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
      include: { ticketCategories: true },
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
        ticketCategories: true,
        tickets: {
          where: { isListed: true },
          select: {
            id: true,
            resalePrice: true,
            listedAt: true,
            ticketCategory: { select: { name: true, price: true } },
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
        ticketCategories: true,
        tickets: {
          where: { isListed: true },
          select: {
            id: true,
            resalePrice: true,
            listedAt: true,
            ticketCategory: { select: { name: true, price: true } },
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
      include: {
        organizer: { select: { name: true, email: true } },
        ticketCategories: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserEvents(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId },
      include: {
        event: true,
        ticketCategory: { select: { name: true, price: true } },
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
          ...ticket,
          ticketCategory: ticket.ticketCategory,
        });
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
      include: { ticketCategories: true },
      orderBy: { date: 'asc' },
    });
  }

  async getPastEvents() {
    return this.prisma.event.findMany({
      where: {
        isActive: true,
        date: { lt: new Date() },
      },
      include: { ticketCategories: true },
      orderBy: { date: 'desc' },
    });
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ThrottlerModule } from '@nestjs/throttler';
import { Role } from '../../generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Mock generated/prisma to prevent module resolution issues
jest.mock('../../generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    },
  })),
}));

// Mock @nestjs/passport to provide a constructor for AuthGuard
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(
    () =>
      class MockAuthGuard {
        canActivate = jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { sub: 'user-id-1', role: 'ORGANIZER' }; // Set req.user for all tests
          return true;
        });
      },
  ),
}));

describe('EventController (e2e)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
    },
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
  };

  const mockUser = { sub: 'user-id-1', role: 'ORGANIZER' };

  // Mock RolesGuard to simulate role-based access
  const mockRolesGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = mockUser; // Ensure req.user is set
      const requiredRoles =
        context.getHandler().roles || context.getClass().roles || [];
      return (
        requiredRoles.length === 0 || requiredRoles.includes(mockUser.role)
      );
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60,
              limit: 10,
            },
          ],
        }),
      ],
      controllers: [EventController],
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    })
      .overrideGuard('JwtGuard')
      .useValue({
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser; // Set req.user for all guarded routes
          return true;
        }),
      })
      .overrideGuard('RolesGuard')
      .useValue(mockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2025-07-08T20:43:00Z').getTime());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/events', () => {
    const createEventDto = {
      name: 'Music Festival',
      price: 50,
      maxTickets: 100,
      date: '2025-07-08T18:00:00Z',
      metadataURI: 'https://example.com/metadata',
    };
    const mockFile = {
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    it('should create an event successfully with file upload', async () => {
      mockCloudinaryService.uploadImage.mockResolvedValue(
        'https://cloudinary.com/image.jpg',
      );
      mockPrismaService.event.create.mockResolvedValue({
        id: 'event-id-1',
        ...createEventDto,
        organizerId: mockUser.sub,
        isActive: true,
        bannerUrl: 'https://cloudinary.com/image.jpg',
      });

      const response = await request(app.getHttpServer())
        .post('/v1/events')
        .set('Authorization', 'Bearer mock-token')
        .field('name', createEventDto.name)
        .field('price', createEventDto.price.toString())
        .field('maxTickets', createEventDto.maxTickets.toString())
        .field('date', createEventDto.date)
        .field('metadataURI', createEventDto.metadataURI)
        .attach('file', mockFile.buffer, 'image.jpg')
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'event-id-1',
        name: createEventDto.name,
        bannerUrl: 'https://cloudinary.com/image.jpg',
      });
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        expect.any(Object),
        'ticketer/events',
      );
      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createEventDto.name,
          price: createEventDto.price,
          maxTickets: createEventDto.maxTickets,
          date: expect.any(String),
          organizerId: mockUser.sub,
          bannerUrl: 'https://cloudinary.com/image.jpg',
          isActive: true,
        }),
      });
    });

    it('should create an event without file upload', async () => {
      mockPrismaService.event.create.mockResolvedValue({
        id: 'event-id-1',
        ...createEventDto,
        organizerId: mockUser.sub,
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post('/v1/events')
        .set('Authorization', 'Bearer mock-token')
        .send(createEventDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'event-id-1',
        name: createEventDto.name,
        bannerUrl: undefined,
      });
      expect(mockCloudinaryService.uploadImage).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if JWT is missing', async () => {
      jest
        .spyOn(mockRolesGuard, 'canActivate')
        .mockImplementationOnce((context) => {
          const request = context.switchToHttp().getRequest();
          request.user = undefined; // Simulate no user
          return false;
        });

      const response = await request(app.getHttpServer())
        .post('/v1/events')
        .send(createEventDto)
        .expect(403);

      expect(response.body.message).toBe('Forbidden resource');
    });

    it('should throw ForbiddenException if user is not an organizer', async () => {
      jest
        .spyOn(mockRolesGuard, 'canActivate')
        .mockImplementationOnce((context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { sub: 'user-id-1', role: Role.USER };
          return false;
        });

      const response = await request(app.getHttpServer())
        .post('/v1/events')
        .set('Authorization', 'Bearer mock-token')
        .send(createEventDto)
        .expect(403);

      expect(response.body.message).toBe('Forbidden resource');
    });
  });

  describe('PATCH /v1/events/:id', () => {
    const updateEventDto = {
      name: 'Updated Festival',
      price: 75,
      maxTickets: 200,
      date: '2025-08-01T18:00:00Z',
    };
    const eventId = 'event-id-1';
    const mockFile = {
      buffer: Buffer.from('fake-image'),
    } as Express.Multer.File;

    it('should update an event successfully with file upload', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: mockUser.sub,
        name: 'Old Festival',
        price: 50,
        maxTickets: 100,
        date: new Date('2025-07-08T18:00:00Z'),
        bannerUrl: 'old-image.jpg',
      });
      mockCloudinaryService.uploadImage.mockResolvedValue(
        'https://cloudinary.com/new-image.jpg',
      );
      mockPrismaService.event.update.mockResolvedValue({
        id: eventId,
        ...updateEventDto,
        organizerId: mockUser.sub,
      });

      const response = await request(app.getHttpServer())
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', 'Bearer mock-token')
        .field('name', updateEventDto.name)
        .field('price', updateEventDto.price.toString())
        .field('maxTickets', updateEventDto.maxTickets.toString())
        .field('date', updateEventDto.date)
        .attach('file', mockFile.buffer, 'image.jpg')
        .expect(200);

      expect(response.body).toMatchObject({
        id: eventId,
        name: updateEventDto.name,
        bannerUrl: 'https://cloudinary.com/new-image.jpg',
      });
      expect(mockPrismaService.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: expect.objectContaining({
          name: updateEventDto.name,
          price: updateEventDto.price,
          maxTickets: updateEventDto.maxTickets,
          date: expect.any(String),
          bannerUrl: 'https://cloudinary.com/new-image.jpg',
        }),
      });
    });

    it('should throw NotFoundException if event does not exist', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateEventDto)
        .expect(404);

      expect(response.body.message).toBe('Event not found');
    });

    it('should throw ForbiddenException if user is not the organizer', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: 'other-user-id',
      });

      const response = await request(app.getHttpServer())
        .patch(`/v1/events/${eventId}`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateEventDto)
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });

    it('should throw Bad Request for invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .patch('/v1/events/invalid-uuid')
        .set('Authorization', 'Bearer mock-token')
        .send(updateEventDto)
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
    });
  });

  describe('PATCH /v1/events/:id/toggle', () => {
    const eventId = 'event-id-1';
    const toggleStatusDto = { isActive: false };

    it('should toggle event status successfully', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: mockUser.sub,
        isActive: true,
      });
      mockPrismaService.event.update.mockResolvedValue({
        id: eventId,
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .patch(`/v1/events/${eventId}/toggle`)
        .set('Authorization', 'Bearer mock-token')
        .send(toggleStatusDto)
        .expect(200);

      expect(response.body).toMatchObject({ id: eventId, isActive: false });
      expect(mockPrismaService.event.update).toHaveBeenCalledWith({
        where: { id: eventId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if event does not exist', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch(`/v1/events/${eventId}/toggle`)
        .set('Authorization', 'Bearer mock-token')
        .send(toggleStatusDto)
        .expect(404);

      expect(response.body.message).toBe('Event not found');
    });

    it('should throw ForbiddenException if user is not the organizer', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue({
        id: eventId,
        organizerId: 'other-user-id',
      });

      const response = await request(app.getHttpServer())
        .patch(`/v1/events/${eventId}/toggle`)
        .set('Authorization', 'Bearer mock-token')
        .send(toggleStatusDto)
        .expect(403);

      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('GET /v1/events', () => {
    it('should get all active events', async () => {
      const mockEvents = [
        {
          id: 'event-id-1',
          name: 'Event 1',
          isActive: true,
          organizer: { name: 'Org', email: 'org@example.com' },
        },
      ];
      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer())
        .get('/v1/events')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual(mockEvents);
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { organizer: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should get filtered events by name', async () => {
      const mockEvents = [
        { id: 'event-id-1', name: 'Music Festival', isActive: true },
      ];
      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer())
        .get('/v1/events?name=Music')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual(mockEvents);
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          name: { contains: 'Music', mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        include: { organizer: { select: { name: true, email: true } } },
      });
    });

    it('should get filtered events by date range', async () => {
      const mockEvents = [
        { id: 'event-id-1', name: 'Event 1', isActive: true },
      ];
      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer())
        .get('/v1/events?from=2025-01-01&to=2025-12-31')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual(mockEvents);
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
        orderBy: { createdAt: 'desc' },
        include: { organizer: { select: { name: true, email: true } } },
      });
    });
  });

  describe('GET /v1/events/organizer/my', () => {
    it('should get organizer events', async () => {
      const mockEvents = [
        { id: 'event-id-1', name: 'Event 1', organizerId: mockUser.sub },
      ];
      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer())
        .get('/v1/events/organizer/my')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual(mockEvents);
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: { organizerId: mockUser.sub },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return message if no events exist', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/v1/events/organizer/my')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'You have not created any events yet',
      });
    });
  });

  describe('GET /v1/events/user/my', () => {
    it('should get user attended events with ticket counts', async () => {
      const mockTickets = [
        {
          eventId: 'event-id-1',
          event: { id: 'event-id-1', name: 'Event 1' },
          userId: mockUser.sub,
        },
        {
          eventId: 'event-id-1',
          event: { id: 'event-id-1', name: 'Event 1' },
          userId: mockUser.sub,
        },
      ];
      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);

      const response = await request(app.getHttpServer())
        .get('/v1/events/user/my')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual([
        { id: 'event-id-1', name: 'Event 1', ticketCount: 2 },
      ]);
    });

    it('should return empty array if no tickets exist', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/v1/events/user/my')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /v1/events/upcoming', () => {
    it('should get upcoming events', async () => {
      const mockEvents = [
        { id: 'event-id-1', name: 'Event 1', date: new Date('2025-07-09') },
      ];
      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer())
        .get('/v1/events/upcoming')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual(mockEvents);
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          date: { gte: expect.any(Date) },
        },
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('GET /v1/events/past', () => {
    it('should get past events', async () => {
      const mockEvents = [
        { id: 'event-id-1', name: 'Event 1', date: new Date('2025-07-07') },
      ];
      mockPrismaService.event.findMany.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer())
        .get('/v1/events/past')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body).toEqual(mockEvents);
      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          date: { lt: expect.any(Date) },
        },
        orderBy: { date: 'desc' },
      });
    });
  });
});

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { UpdateEventDto } from './dto/update-event.dto';
import { ToggleEventStatusDto } from './dto/toggle-status.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Events')
@Controller('v1/events')
@ApiBearerAuth()
export class EventController {
  constructor(private eventService: EventService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get all active events with optional filters',
    description:
      'Retrieves all active events, optionally filtered by name and/or date range.',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filter by event name (case-insensitive)',
    type: String,
    example: 'Music Festival',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
    type: String,
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
    type: String,
    example: '2025-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active events',
    type: [Object],
  })
  getAll(@Query() query: { name?: string; from?: string; to?: string }) {
    if (query.name || query.from || query.to) {
      return this.eventService.getAllEventsFiltered(query);
    }
    return this.eventService.getAllEvents();
  }

  @Get('slug/:slug')
  @ApiParam({ name: 'slug', type: String })
  getEventBySlug(@Param('slug') slug: string) {
    return this.eventService.getEventBySlug(slug);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Retrieves a single event by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the event',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Event found',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid UUID' })
  getEvent(@Param('id') id: string) {
    return this.eventService.getSingleEvent(id);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Post('create')
  @HttpCode(201)
  @Roles(Role.ORGANIZER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new event',
    description:
      'Creates a new event with optional banner image upload for the authenticated organizer.',
  })
  @ApiBody({
    description: 'Event creation data and optional file upload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Music Festival' },
        price: { type: 'number', example: 50.0 },
        description: {
          type: 'string',
          example:
            'A music festival hosted by Davido and Rema. You have to be there',
        },
        location: {
          type: 'string',
          description: 'Lekki Conservation Centre, Lagos',
        },
        category: {
          type: 'string',
          description: 'MUSIC',
        },
        maxTickets: { type: 'number', example: 100 },
        date: {
          type: 'string',
          format: 'date-time',
          example: '2025-07-08T18:00:00Z',
        },
        file: { type: 'string', format: 'binary' },
      },
      required: [
        'name',
        'metadataURI',
        'price',
        'maxTickets',
        'date',
        'description',
        'location',
        'çategory',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: Object,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: User is not an organizer',
  })
  create(
    @Body() dto: CreateEventDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const user = req.user;
    return this.eventService.createEvent(dto, user.sub, file);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Get('user/my')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get user’s attended events',
    description:
      'Retrieves events for which the authenticated user has purchased tickets, including ticket counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user events with ticket counts',
    type: [Object],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  getMyAttendedEvents(@Req() req) {
    return this.eventService.getUserEvents(req.user.sub);
  }

  @Get('upcoming')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get upcoming events',
    description: 'Retrieves all active events with a future date.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of upcoming events',
    type: [Object],
  })
  getUpcoming() {
    return this.eventService.getUpcomingEvents();
  }

  @Get('past')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get past events',
    description: 'Retrieves all active events with a past date.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of past events',
    type: [Object],
  })
  getPast() {
    return this.eventService.getPastEvents();
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Get('organizer/my')
  @HttpCode(200)
  @Roles(Role.ORGANIZER)
  @ApiOperation({
    summary: 'Get organizer’s events',
    description: 'Retrieves all events created by the authenticated organizer.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of organizer events or message if none exist',
    type: [Object],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: User is not an organizer',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  getOrganizerEvents(@Req() req) {
    return this.eventService.getOrganizerEvents(req.user.sub);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Patch(':id')
  @Roles(Role.ORGANIZER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update an event',
    description:
      'Updates an existing event by ID with optional banner image upload for the authenticated organizer.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the event to update',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Event update data and optional file upload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Festival' },
        price: { type: 'number', example: 75.0 },
        description: {
          type: 'string',
          example:
            'A music festival hosted by Davido and Rema. You have to be there',
        },
        location: {
          type: 'string',
          description: 'Lekki Conservation Centre, Lagos',
        },
        category: {
          type: 'string',
          description: 'MUSIC',
        },
        maxTickets: { type: 'number', example: 200 },
        date: {
          type: 'string',
          format: 'date-time',
          example: '2025-08-01T18:00:00Z',
        },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: User is not the organizer',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.eventService.updateEvent(id, dto, req.user.sub, file);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Delete(':id')
  @Roles(Role.ORGANIZER)
  @ApiOperation({
    summary: 'Delete an event',
    description:
      'Deletes an event by ID if no tickets have been purchased for it. Only accessible to the authenticated organizer.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the event to delete',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Event deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden: User is not the organizer or tickets have already been purchased for the event',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid UUID' })
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.eventService.deleteEvent(id, req.user.sub);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Patch(':id/toggle')
  @Roles(Role.ORGANIZER)
  @ApiOperation({
    summary: 'Toggle event status',
    description:
      'Activates or deactivates an event by ID for the authenticated organizer.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the event',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: ToggleEventStatusDto,
    description: 'Event status toggle data',
  })
  @ApiResponse({
    status: 200,
    description: 'Event status updated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: User is not the organizer',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid UUID' })
  toggleEventStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleEventStatusDto,
    @Req() req,
  ) {
    return this.eventService.toggleEventStatus(id, dto.isActive, req.user.sub);
  }
}

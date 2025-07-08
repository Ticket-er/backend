import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { TicketService } from './ticket.service';
import { BuyNewDto } from './dto/buy-new.dto';
import { ListResaleDto } from './dto/list-resale.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Tickets')
@UseGuards(JwtGuard)
@Controller('v1/tickets')
@ApiBearerAuth()
export class TicketController {
  constructor(private ticketService: TicketService) {}

  @Post(':eventId/buy')
  @ApiOperation({
    summary: 'Buy a new ticket',
    description:
      'Purchases a new ticket for the specified event for the authenticated user.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'UUID of the event',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Ticket purchase data',
    schema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'UUID of the event to buy a ticket for',
        },
      },
      required: ['eventId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket purchased successfully',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Event not found or inactive' })
  @ApiResponse({ status: 400, description: 'Event already passed or sold out' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  buyNew(@Body() dto: BuyNewDto, @Req() req) {
    return this.ticketService.buyNewTicket(dto, req.user.sub);
  }

  @Post(':ticketId/resell')
  @ApiOperation({
    summary: 'List ticket for resale',
    description: 'Lists a ticket for resale by the authenticated user.',
  })
  @ApiParam({
    name: 'ticketId',
    description: 'UUID of the ticket',
    type: String,
    example: '789a123b-456c-78d9-e012-3456789f1234',
  })
  @ApiBody({
    description: 'Resale listing data',
    schema: {
      type: 'object',
      properties: {
        resalePrice: {
          type: 'number',
          example: 75.0,
          description: 'Price for the ticket resale (minimum 0)',
        },
      },
      required: ['resalePrice'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket listed for resale successfully',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Not your ticket' })
  @ApiResponse({
    status: 400,
    description:
      'Ticket already used, already listed, or can only be resold once',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  listForResale(
    @Param('ticketId') ticketId: string,
    @Body() dto: ListResaleDto,
    @Req() req,
  ) {
    return this.ticketService.listForResale(ticketId, dto, req.user.sub);
  }

  @Get('resell')
  @ApiOperation({
    summary: 'Browse resale tickets',
    description:
      'Retrieves tickets listed for resale, optionally filtered by event ID.',
  })
  @ApiQuery({
    name: 'eventId',
    required: false,
    description: 'UUID of the event to filter resale tickets',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of resale tickets',
    type: [Object],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  browseResale(@Query('eventId') eventId?: string) {
    return this.ticketService.getResaleTickets(eventId);
  }

  @Post('resale/:ticketId/buy')
  @ApiOperation({
    summary: 'Buy a resale ticket',
    description:
      'Purchases a ticket listed for resale by the authenticated user.',
  })
  @ApiParam({
    name: 'ticketId',
    description: 'UUID of the resale ticket',
    type: String,
    example: '789a123b-456c-78d9-e012-3456789f1234',
  })
  @ApiResponse({
    status: 200,
    description: 'Resale ticket purchased successfully',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({
    status: 400,
    description: 'Ticket not for sale or cannot buy your own ticket',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  buyResale(@Param('ticketId') ticketId: string, @Req() req) {
    return this.ticketService.buyResaleTicket(ticketId, req.user.sub);
  }

  @Get('my/resales')
  @ApiOperation({
    summary: 'Get my resale listings',
    description:
      'Retrieves all tickets listed for resale by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user’s resale tickets',
    type: [Object],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  myListings(@Req() req) {
    return this.ticketService.getMyListings(req.user.sub);
  }

  @Get('bought-from-resale')
  @ApiOperation({
    summary: 'Get tickets bought from resale',
    description:
      'Retrieves all tickets purchased from resale by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tickets bought from resale',
    type: [Object],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  boughtFromResale(@Req() req) {
    return this.ticketService.getBoughtFromResale(req.user.sub);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my tickets',
    description: 'Retrieves all tickets owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user’s tickets',
    type: [Object],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  myTickets(@Req() req) {
    return this.ticketService.getMyTickets(req.user.sub);
  }
}

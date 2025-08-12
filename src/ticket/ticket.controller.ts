import {
  Body,
  Controller,
  Get,
  Headers,
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
import { BuyResaleDto } from './dto/buy-resale.dto';
import { RemoveResaleDto } from './dto/remove-resale.dto';

@ApiTags('Tickets')
@Controller('v1/tickets')
@ApiBearerAuth()
export class TicketController {
  constructor(private ticketService: TicketService) {}

  @UseGuards(JwtGuard)
  @Post('verify')
  @ApiOperation({
    summary: 'Verify a ticket (scan or code input)',
    description:
      'Anyone can check if a ticket is valid or used. Only the organizer can mark it as used.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
        code: { type: 'string', example: 'TCK-9X8B7Z' },
        eventId: { type: 'string', example: 'clx81r0jk0000s1aofh4c4z3a' },
      },
      required: ['eventId'],
    },
  })
  @UseGuards(JwtGuard) // still protected
  verifyTicket(@Body() body, @Req() req) {
    return this.ticketService.verifyTicket({
      ...body,
      userId: req.user.sub,
    });
  }

  @UseGuards(JwtGuard)
  @Post('buy')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buy a new ticket',
    description: 'Purchases a new ticket for a specific event.',
  })
  @ApiParam({
    name: 'eventId',
    description: 'UUID of the event',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Payload to specify how many tickets to buy',
    type: BuyNewDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket purchase initiated, returns checkout URL',
    schema: {
      type: 'object',
      properties: {
        checkoutUrl: {
          type: 'string',
          example: 'https://checkout.kora.com/pay/abc123',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Event not found or inactive' })
  @ApiResponse({
    status: 400,
    description: 'Invalid quantity or event expired',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  buyNew(
    @Headers('x-client-page') clientPage: string,
    @Body() dto: BuyNewDto,
    @Req() req,
  ) {
    return this.ticketService.buyNewTicket(dto, req.user.sub, clientPage);
  }

  @Post('resale/buy')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buy resale tickets',
    description:
      'Allows a user to buy one or more resale tickets listed by other users.',
  })
  @ApiBody({
    type: BuyResaleDto,
    description:
      'Payload with ticket IDs of resale tickets the user wants to buy.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Resale transaction initiated successfully, returns checkout URL',
    schema: {
      type: 'object',
      properties: {
        checkoutUrl: {
          type: 'string',
          example: 'https://checkout.kora.com/pay/resale_xyz123',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid ticket IDs, attempting to buy your own ticket, or other business rule violations',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket(s) not found or not listed for resale',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  buyResaleTickets(@Body() dto: BuyResaleDto, @Req() req) {
    return this.ticketService.buyResaleTicket(dto, req.user.sub);
  }

  @UseGuards(JwtGuard)
  @Post('resale/list')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List multiple tickets for resale',
    description: 'Lists one ticket for resale by the authenticated user.',
  })
  @ApiBody({ type: ListResaleDto })
  @ApiResponse({
    status: 200,
    description: 'Tickets listed for resale successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          resalePrice: { type: 'number' },
          listedAt: { type: 'string', format: 'date-time' },
          isListed: { type: 'boolean' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'One or more tickets not found or not owned by user',
  })
  @ApiResponse({
    status: 400,
    description:
      'Tickets already used, already listed, or cannot be resold again',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listForResale(@Body() dto: ListResaleDto, @Req() req) {
    return this.ticketService.listForResale(dto, req.user.sub);
  }

  @UseGuards(JwtGuard)
  @Post('resale/remove')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove ticket from resale',
    description:
      'Removes a listed ticket from resale by the authenticated user.',
  })
  @ApiBody({ type: RemoveResaleDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket removed from resale successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        resalePrice: { type: 'number', nullable: true },
        listedAt: { type: 'string', format: 'date-time', nullable: true },
        isListed: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found or not owned by user',
  })
  @ApiResponse({
    status: 400,
    description: 'Ticket is not currently listed for resale',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeFromResale(@Body() dto: RemoveResaleDto, @Req() req) {
    return this.ticketService.removeFromResale(dto, req.user.sub);
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

  @UseGuards(JwtGuard)
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

  @UseGuards(JwtGuard)
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

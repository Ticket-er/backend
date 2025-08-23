/* eslint-disable prettier/prettier */
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
      'Anyone can check if a ticket is valid or used. Only the organiser can mark it as used. Returns ticket details including category.',
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
  @ApiResponse({
    status: 200,
    description: 'Ticket verification result',
    schema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
        code: { type: 'string', example: 'TCK-9X8B7Z' },
        eventId: { type: 'string', example: 'clx81r0jk0000s1aofh4c4z3a' },
        ticketCategory: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'VVIP' },
            price: { type: 'number', example: 100 },
          },
        },
        status: { type: 'string', enum: ['USED', 'VALID'] },
        markedUsed: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Ticket marked as used' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request: Missing ticketId or code',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found',
  })
  verifyTicket(@Body() body, @Req() req) {
    return this.ticketService.verifyTicket({
      ...body,
      userId: req.user.sub,
    });
  }

  @UseGuards(JwtGuard)
  @Post('buy')
  @ApiOperation({
    summary: 'Buy new tickets',
    description:
      'Purchases new tickets for a specific event across multiple ticket categories.',
  })
  @ApiBody({
    description:
      'Payload to specify event and ticket categories with quantities to buy',
    type: BuyNewDto,
    schema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        ticketCategories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ticketCategoryId: {
                type: 'string',
                example: 'clx81wekg0000ueaom6b8x7ti',
                description: 'UUID of the ticket category (e.g., VVIP, VIP, Regular)',
              },
              quantity: { type: 'number', example: 2 },
            },
            required: ['ticketCategoryId', 'quantity'],
          },
        },
      },
      required: ['eventId', 'ticketCategories'],
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Ticket purchase initiated, returns checkout URL or free ticket confirmation',
    schema: {
      type: 'object',
      properties: {
        checkoutUrl: {
          type: 'string',
          example: 'https://checkout.kora.com/pay/abc123',
          nullable: true,
        },
        message: {
          type: 'string',
          example: 'Free tickets created successfully',
          nullable: true,
        },
        ticketIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['clx81wekg0000ueaom6b8x7ti', 'clx81wekg0001ueaom6b8x7ti'],
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid quantity, category, or event expired',
  })
  @ApiResponse({
    status: 404,
    description: 'Event or ticket category not found',
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
  @ApiOperation({
    summary: 'List ticket for resale',
    description: 'Lists one ticket for resale by the authenticated user.',
  })
  @ApiBody({ type: ListResaleDto })
  @ApiResponse({
    status: 200,
    description: 'Ticket listed for resale successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
        resalePrice: { type: 'number', example: 120 },
        listedAt: {
          type: 'string',
          format: 'date-time',
          example: '2025-08-21T14:50:00Z',
        },
        isListed: { type: 'boolean', example: true },
        ticketCategory: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'VVIP' },
            price: { type: 'number', example: 100 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket not found or not owned by user',
  })
  @ApiResponse({
    status: 400,
    description:
      'Ticket already used, already listed, or cannot be resold again',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listForResale(@Body() dto: ListResaleDto, @Req() req) {
    return this.ticketService.listForResale(dto, req.user.sub);
  }

  @UseGuards(JwtGuard)
  @Post('resale/remove')
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
        id: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
        resalePrice: { type: 'number', nullable: true, example: null },
        listedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
          example: null,
        },
        isListed: { type: 'boolean', example: false },
        ticketCategory: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'VVIP' },
            price: { type: 'number', example: 100 },
          },
        },
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
      'Retrieves tickets listed for resale, optionally filtered by event ID, including ticket category details.',
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
    description: 'List of resale tickets with category details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
          resalePrice: { type: 'number', example: 120 },
          listedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-08-21T14:50:00Z',
          },
          event: {
            type: 'object',
            properties: { name: { type: 'string', example: 'Music Festival' } },
          },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              profileImage: { type: 'string', nullable: true },
            },
          },
          ticketCategory: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'VVIP' },
              price: { type: 'number', example: 100 },
            },
          },
        },
      },
    },
  })
  browseResale(@Query('eventId') eventId?: string) {
    return this.ticketService.getResaleTickets(eventId);
  }

  @UseGuards(JwtGuard)
  @Get('my/resales')
  @ApiOperation({
    summary: 'Get my resale listings',
    description:
      'Retrieves all tickets listed for resale by the authenticated user, including ticket category details.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user’s resale tickets with category details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
          resalePrice: { type: 'number', example: 120 },
          listedAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-08-21T14:50:00Z',
          },
          event: {
            type: 'object',
            properties: { name: { type: 'string', example: 'Music Festival' } },
          },
          ticketCategory: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'VVIP' },
              price: { type: 'number', example: 100 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  myListings(@Req() req) {
    return this.ticketService.getMyListings(req.user.sub);
  }

  @UseGuards(JwtGuard)
  @Get('bought-from-resale')
  @ApiOperation({
    summary: 'Get tickets bought from resale',
    description:
      'Retrieves all tickets purchased from resale by the authenticated user, including ticket category details.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tickets bought from resale with category details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
          event: {
            type: 'object',
            properties: { name: { type: 'string', example: 'Music Festival' } },
          },
          user: {
            type: 'object',
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
          ticketCategory: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'VVIP' },
              price: { type: 'number', example: 100 },
            },
          },
        },
      },
    },
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
    description:
      'Retrieves all tickets owned by the authenticated user, including ticket category details.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user’s tickets with category details',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx81wekg0000ueaom6b8x7ti' },
          event: {
            type: 'object',
            properties: { name: { type: 'string', example: 'Music Festival' } },
          },
          ticketCategory: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'VVIP' },
              price: { type: 'number', example: 100 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  myTickets(@Req() req) {
    return this.ticketService.getMyTickets(req.user.sub);
  }
}
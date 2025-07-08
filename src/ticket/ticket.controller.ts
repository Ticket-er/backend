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

@UseGuards(JwtGuard)
@Controller('tickets')
export class TicketController {
  constructor(private ticketService: TicketService) {}

  // 1. Buy new ticket
  @Post('/:eventId/buy')
  buyNew(@Body() dto: BuyNewDto, @Req() req) {
    return this.ticketService.buyNewTicket(dto, req.user.sub);
  }

  // 2. List for resale
  @Post(':ticketId/resell')
  listForResale(
    @Param('ticketId') ticketId: string,
    @Body() dto: ListResaleDto,
    @Req() req,
  ) {
    return this.ticketService.listForResale(ticketId, dto, req.user.sub);
  }

  // 3. Browse resale
  @Get('resell')
  browseResale(@Query('eventId') eventId?: string) {
    return this.ticketService.getResaleTickets(eventId);
  }

  // 4. Buy from resale
  @Post('resale/:ticketId/buy')
  buyResale(@Param('ticketId') ticketId: string, @Req() req) {
    return this.ticketService.buyResaleTicket(ticketId, req.user.sub);
  }

  // 5. My Listings
  @Get('my/resales')
  myListings(@Req() req) {
    return this.ticketService.getMyListings(req.user.sub);
  }

  // 6. Tickets bought via resale
  @Get('bought-from-resale')
  boughtFromResale(@Req() req) {
    return this.ticketService.getBoughtFromResale(req.user.sub);
  }

  // 7. My tickets (all)
  @Get('my')
  myTickets(@Req() req) {
    return this.ticketService.getMyTickets(req.user.sub);
  }
}

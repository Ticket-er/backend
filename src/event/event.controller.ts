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
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Role } from 'generated/prisma';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UpdateEventDto } from './dto/update-event.dto';
import { ToggleEventStatusDto } from './dto/toggle-status.dto';

@Controller('events')
@UseGuards(JwtGuard, RolesGuard)
export class EventController {
  constructor(private eventService: EventService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAll(@Query() query) {
    if (query.name || query.from || query.to) {
      return this.eventService.getAllEventsFiltered(query);
    }
  }

  @Post()
  @Roles(Role.ORGANIZER)
  create(@Body() dto: CreateEventDto, @Req() req) {
    const user = req.user;
    return this.eventService.createEvent(dto, user.sub);
  }

  @UseGuards(JwtGuard)
  @Get('user/my')
  getMyAttendedEvents(@Req() req) {
    return this.eventService.getUserEvents(req.user.sub);
  }

  @Get('upcoming')
  getUpcoming() {
    return this.eventService.getUpcomingEvents();
  }

  @Get('past')
  getPast() {
    return this.eventService.getPastEvents();
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  @Get('organizer/my')
  getOrganizerEvents(@Req() req) {
    return this.eventService.getOrganizerEvents(req.user.sub);
  }

  @Patch(':id')
  @Roles(Role.ORGANIZER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
    @Req() req,
  ) {
    return this.eventService.updateEvent(id, dto, req.user.sub);
  }

  @Patch(':id/toggle')
  @Roles(Role.ORGANIZER)
  toggleEventStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleEventStatusDto,
    @Req() req,
  ) {
    return this.eventService.toggleEventStatus(id, dto.isActive, req.user.sub);
  }
}

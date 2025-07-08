import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';

@Module({
  imports: [PrismaModule],
  providers: [TicketService],
  controllers: [TicketController],
})
export class TicketModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // ✅ THIS is what you're missing
import { PrismaModule } from 'src/prisma/prisma.module';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [HttpModule, PrismaModule, PaymentModule],
  providers: [TicketService],
  controllers: [TicketController],
})
export class TicketModule {}

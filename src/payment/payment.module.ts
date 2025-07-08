import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}

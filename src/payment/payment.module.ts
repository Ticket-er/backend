import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentController } from './payment.controller';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [PaymentService],
  exports: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}

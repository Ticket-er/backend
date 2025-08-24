import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [HttpModule, PrismaModule, MailModule],
  providers: [PaymentService],
  exports: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}

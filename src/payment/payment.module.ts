import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentController } from './payment.controller';
import { MailModule } from 'src/mail/mail.module';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [HttpModule, PrismaModule, MailModule],
  providers: [PaymentService, MailService],
  exports: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}

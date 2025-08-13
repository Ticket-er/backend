import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventService } from './event/event.service';
import { EventModule } from './event/event.module';
import { TicketService } from './ticket/ticket.service';
import { TicketModule } from './ticket/ticket.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { PaymentService } from './payment/payment.service';
import { PaymentModule } from './payment/payment.module';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from './wallet/wallet.module';
import { MailService } from './mail/mail.service';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    AuthModule,
    MailModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    EventModule,
    TicketModule,
    CloudinaryModule,
    PaymentModule,
    HttpModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EventService,
    TicketService,
    PaymentService,
    MailService,
  ],
})
export class AppModule {}

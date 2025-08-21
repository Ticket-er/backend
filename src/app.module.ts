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
import { CacheModule } from '@nestjs/cache-manager';
import { CacheHelper } from './common/cache/cache.helper';

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
    CacheModule.register({
      ttl: 3600,
      max: 1000,
    }),
  ],
  controllers: [AppController],
  providers: [
    CacheHelper,
    AppService,
    EventService,
    TicketService,
    PaymentService,
    MailService,
  ],
  exports: [CacheHelper],
})
export class AppModule {}

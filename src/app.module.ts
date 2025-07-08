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
import { TicketController } from './ticket/ticket.controller';
import { TicketService } from './ticket/ticket.service';
import { TicketModule } from './ticket/ticket.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

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
  ],
  controllers: [AppController, TicketController],
  providers: [AppService, EventService, TicketService],
})
export class AppModule {}

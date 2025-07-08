import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  providers: [UserService, CloudinaryService, PrismaService],
  controllers: [UserController],
})
export class UsersModule {}

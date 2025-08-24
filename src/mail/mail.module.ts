import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

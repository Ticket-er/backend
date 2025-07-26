import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let hashedPassword: string | undefined;
    if (dto.password) {
      if (dto.password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    let uploadedImageUrl: string | undefined;
    if (file) {
      const uploadResult = await this.cloudinary.uploadImage(
        file,
        'ticket-er/profiles',
      );
      uploadedImageUrl = uploadResult;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name || user.name,
        password: hashedPassword || user.password,
        profileImage: uploadedImageUrl || user.profileImage,
      },
    });

    return { message: 'Profile updated successfully', user: updatedUser };
  }

  async becomeOrganizer(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ORGANIZER') {
      throw new BadRequestException('User is already an organizer');
    }

    // Update role
    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: 'ORGANIZER' },
    });

    // Ensure wallet exists
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });
    if (!wallet) {
      await this.prisma.wallet.create({
        data: { userId: user.id, balance: 0 },
      });
    }

    return { message: 'You are now an organizer!' };
  }
}

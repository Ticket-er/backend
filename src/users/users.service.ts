import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Updating user with ID: ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found with ID: ${userId}`);
      throw new NotFoundException('User not found');
    }

    let hashedPassword: string | undefined;
    if (dto.password) {
      if (dto.password.length < 6) {
        this.logger.warn(`Password too short for user ID: ${userId}`);
        throw new BadRequestException('Password must be at least 6 characters');
      }
      hashedPassword = await bcrypt.hash(dto.password, 10);
      this.logger.log(`Password hashed for user ID: ${userId}`);
    }

    let uploadedImageUrl: string | undefined;
    if (file) {
      try {
        const upload = await this.cloudinary.uploadImage(
          file,
          'ticket-er/profiles',
        );
        uploadedImageUrl = upload;
        this.logger.log(`Image uploaded successfully: ${uploadedImageUrl}`);
      } catch (err) {
        this.logger.error(`Image upload failed: ${err.message}`);
        throw new InternalServerErrorException('Failed to upload event banner');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name || user.name,
        password: hashedPassword || user.password,
        profileImage: uploadedImageUrl || user.profileImage,
      },
    });

    this.logger.log(`User updated successfully: ${userId}`);

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
      const wallet = await this.prisma.wallet.create({
        data: {
          userId: user.id,
        },
      });

      return {
        message: 'Wallet created successfully',
        walletId: wallet.id,
      };
    }

    return { message: 'You are now an organizer!' };
  }
}

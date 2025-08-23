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
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // =====================
  // HELPER METHODS
  // =====================

  private async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`User not found with ID: ${userId}`);
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async findUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async handlePasswordUpdate(password: string, userId: string) {
    if (password.length < 6) {
      this.logger.warn(`Password too short for user ID: ${userId}`);
      throw new BadRequestException('Password must be at least 6 characters');
    }
    const hashed = await bcrypt.hash(password, 10);
    this.logger.log(`Password hashed for user ID: ${userId}`);
    return hashed;
  }

  private async handleImageUpload(file: Express.Multer.File) {
    try {
      const uploadedImageUrl = await this.cloudinary.uploadImage(
        file,
        'ticketer/profiles',
      );
      this.logger.log(`Image uploaded successfully: ${uploadedImageUrl}`);
      return uploadedImageUrl;
    } catch (err) {
      this.logger.error(`Image upload failed: ${err.message}`);
      throw new InternalServerErrorException('Failed to upload profile image');
    }
  }

  private async promoteToOrganizer(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ORGANIZER' },
    });
  }

  private async ensureWalletExists(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return await this.prisma.wallet.create({ data: { userId } });
    }
    return null;
  }

  // =====================
  // PUBLIC METHODS
  // =====================

  async getCurrentUser(userId: string) {
    this.logger.log(`Fetching user with ID: ${userId}`);
    const user = await this.findUserById(userId);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    };
  }

  async updateUser(
    userId: string,
    dto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    this.logger.log(`Updating user with ID: ${userId}`);

    const user = await this.findUserById(userId);

    const hashedPassword = dto.password
      ? await this.handlePasswordUpdate(dto.password, userId)
      : undefined;

    const uploadedImageUrl = file
      ? await this.handleImageUpload(file)
      : undefined;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name ?? user.name,
        password: hashedPassword ?? user.password,
        profileImage: uploadedImageUrl ?? user.profileImage,
      },
    });

    this.logger.log(`User updated successfully: ${userId}`);

    return {
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        isVerified: updatedUser.isVerified,
      },
    };
  }

  async becomeOrganizer(email: string) {
    const user = await this.findUserByEmail(email);

    if (user.role === 'ORGANIZER') {
      throw new BadRequestException('User is already an organizer');
    }

    await this.promoteToOrganizer(user.id);

    const wallet = await this.ensureWalletExists(user.id);

    if (wallet) {
      return { message: 'Wallet created successfully', walletId: wallet.id };
    }

    return { message: 'You are now an organizer!' };
  }
}

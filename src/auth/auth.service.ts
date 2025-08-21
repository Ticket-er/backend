import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtService } from '@nestjs/jwt';
import { generateOTP, getOtpExpiry } from '../common/utils/otp.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CacheHelper } from 'src/common/cache/cache.helper';
import { QueueHelper } from 'src/common/queue/queue.helper';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheHelper: CacheHelper,
    private queueHelper: QueueHelper,
  ) {}

  async register(dto: RegisterDto) {
    try {
      // Check for existing user with minimal fields
      const existing = await this.cacheHelper.getOrSet(
        dto.email,
        async () =>
          this.prisma.user.findUnique({
            where: { email: dto.email },
            select: { id: true },
          }),
        { keyPrefix: 'user:email:', ttl: 300 },
      );

      if (existing) throw new ConflictException('Email already registered');

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const otp = generateOTP();
      const otpExpiresAt = getOtpExpiry();

      // Create user in a transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            otp,
            otpExpiresAt,
          },
          select: { id: true, email: true, name: true },
        });
      });

      // Enqueue email tasks
      await this.queueHelper.enqueue('send-registration', {
        email: dto.email,
        name: dto.name,
      });
      await this.queueHelper.enqueue('send-otp', {
        email: dto.email,
        name: dto.name,
        otp,
      });

      // Invalidate cache
      await this.cacheHelper.invalidate(`user:email:${dto.email}`);

      return {
        message: 'Account created. Check your email for verification OTP.',
      };
    } catch (err) {
      return {
        message: err.message || 'Internal Server Error: Try Again Later',
      };
    }
  }

  async login(dto: LoginDto) {
    const user = await this.cacheHelper.getOrSet(
      dto.email,
      async () =>
        this.prisma.user.findUnique({
          where: { email: dto.email },
          select: {
            id: true,
            email: true,
            password: true,
            isVerified: true,
            role: true,
            profileImage: true,
            name: true,
          },
        }),
      { keyPrefix: 'user:email:', ttl: 300 },
    );

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new BadRequestException('Invalid password');
    if (!user.isVerified) throw new BadRequestException('Email not verified');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '2 days',
    });

    // Enqueue login email
    await this.queueHelper.enqueue('send-login', {
      email: user.email,
      name: user.name ?? 'user',
    });

    return {
      access_token: token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.cacheHelper.getOrSet(
      dto.email,
      async () =>
        this.prisma.user.findUnique({
          where: { email: dto.email },
          select: {
            id: true,
            email: true,
            otp: true,
            otpExpiresAt: true,
            isVerified: true,
          },
        }),
      { keyPrefix: 'user:email:', ttl: 300 },
    );

    if (!user || !user.otp || !user.otpExpiresAt)
      throw new NotFoundException('Invalid request');
    if (user.otp !== dto.otp) throw new BadRequestException('Incorrect OTP');
    if (new Date() > user.otpExpiresAt)
      throw new BadRequestException('OTP expired');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: dto.email },
        data: {
          isVerified: true,
          otp: null,
          otpExpiresAt: null,
        },
        select: { id: true },
      });
    });

    await this.cacheHelper.invalidate(`user:email:${dto.email}`);

    return { message: 'Email verified successfully' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.cacheHelper.getOrSet(
      dto.email,
      async () =>
        this.prisma.user.findUnique({
          where: { email: dto.email },
          select: { id: true, email: true, isVerified: true, name: true },
        }),
      { keyPrefix: 'user:email:', ttl: 300 },
    );

    if (!user) throw new NotFoundException('User not found');
    if (dto.context === 'register' && user.isVerified)
      throw new BadRequestException('Email already verified');

    const otp = generateOTP();
    const otpExpiresAt = getOtpExpiry();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: dto.email },
        data: { otp, otpExpiresAt },
        select: { id: true },
      });
    });

    await this.queueHelper.enqueue('send-otp', {
      email: user.email,
      name: user.name ?? 'user',
      otp,
    });

    await this.cacheHelper.invalidate(`user:email:${dto.email}`);

    return { message: 'New OTP sent to your email' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.cacheHelper.getOrSet(
      dto.email,
      async () =>
        this.prisma.user.findUnique({
          where: { email: dto.email },
          select: { id: true, email: true },
        }),
      { keyPrefix: 'user:email:', ttl: 300 },
    );

    if (!user) throw new NotFoundException('User not found');

    const otp = generateOTP();
    const otpExpiresAt = getOtpExpiry();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: dto.email },
        data: { otp, otpExpiresAt },
        select: { id: true },
      });
    });

    await this.queueHelper.enqueue('send-otp', {
      email: dto.email,
      name: 'user',
      otp,
    });

    await this.cacheHelper.invalidate(`user:email:${dto.email}`);

    return { message: 'OTP sent to email for password reset' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.cacheHelper.getOrSet(
      dto.email,
      async () =>
        this.prisma.user.findUnique({
          where: { email: dto.email },
          select: { id: true, email: true, otp: true, otpExpiresAt: true },
        }),
      { keyPrefix: 'user:email:', ttl: 300 },
    );

    if (!user || !user.otp || !user.otpExpiresAt)
      throw new BadRequestException('Invalid reset request');
    if (user.otp !== dto.otp) throw new BadRequestException('Incorrect OTP');
    if (new Date() > user.otpExpiresAt)
      throw new BadRequestException('OTP expired');

    const newHashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: dto.email },
        data: {
          password: newHashed,
          otp: null,
          otpExpiresAt: null,
        },
        select: { id: true },
      });
    });

    await this.cacheHelper.invalidate(`user:email:${dto.email}`);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.cacheHelper.getOrSet(
      userId,
      async () =>
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, password: true },
        }),
      { keyPrefix: 'user:id:', ttl: 300 },
    );

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException(
        'New password must be different from current password',
      );

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
        select: { id: true },
      });
    });

    await this.cacheHelper.invalidate(`user:id:${userId}`);

    return { message: 'Password changed successfully' };
  }
}

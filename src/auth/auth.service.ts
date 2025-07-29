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
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('Email already registered');

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const otp = generateOTP();
      const otpExpiresAt = getOtpExpiry();

      await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
          otp,
          otpExpiresAt,
        },
      });

      await this.mailService.sendOtp(dto.email, dto.name, otp);
      return {
        message: 'Account created. Check your email for verification OTP.',
      };
    } catch (err) {
      return { message: err || 'Internal Server Error: Try Again Later' };
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new BadRequestException('Invalid password');
    if (!user.isVerified) throw new BadRequestException('Email not verified');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '2 days',
    });

    return { access_token: token, user };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.otp || !user.otpExpiresAt)
      throw new NotFoundException('Invalid request');

    if (user.otp !== dto.otp) throw new BadRequestException('Incorrect OTP');
    if (new Date() > user.otpExpiresAt)
      throw new BadRequestException('OTP expired');

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('User not found');

    if (dto.context === 'register' && user.isVerified)
      throw new BadRequestException('Email already verified');

    const otp = generateOTP();
    const otpExpiresAt = getOtpExpiry();

    await this.prisma.user.update({
      where: { email: dto.email },
      data: { otp, otpExpiresAt },
    });

    await this.mailService.sendOtp(user.email, user.name ?? 'user', otp);

    return { message: 'New OTP sent to your email' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const otp = generateOTP();
    const otpExpiresAt = getOtpExpiry();

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        otp,
        otpExpiresAt,
      },
    });

    await this.mailService.sendOtp(dto.email, 'user', otp);
    return { message: 'OTP sent to email for password reset' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid reset request');
    }

    if (user.otp !== dto.otp) throw new BadRequestException('Incorrect OTP');
    if (new Date() > user.otpExpiresAt)
      throw new BadRequestException('OTP expired');

    const newHashed = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { email: dto.email },
      data: {
        password: newHashed,
        otp: null,
        otpExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { newPassword, currentPassword } = dto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    return { message: 'Password changed successfully' };
  }
}

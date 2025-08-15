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

  // Private Helpers
  private async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  private async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  private async hashPassword(password: string): Promise<string> {
    const hashed = await bcrypt.hash(password, 10);
    return hashed;
  }

  private async validatePasswordMatch(
    providedPassword: string,
    storedPassword: string,
  ): Promise<boolean> {
    const valid = await bcrypt.compare(providedPassword, storedPassword);
    return valid;
  }

  private async generateAndSaveOtp(
    email: string,
  ): Promise<{ otp: string; otpExpiresAt: Date }> {
    const otp = generateOTP();
    const otpExpiresAt = getOtpExpiry();
    await this.prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });
    return { otp, otpExpiresAt };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async validateOtp(user: any, providedOtp: string) {
    if (!user.otp || !user.otpExpiresAt) {
      throw new BadRequestException('Invalid OTP request');
    }
    if (user.otp !== providedOtp) {
      throw new BadRequestException('Incorrect OTP');
    }
    if (new Date() > user.otpExpiresAt) {
      throw new BadRequestException('OTP expired');
    }
  }

  private async clearOtp(email: string) {
    await this.prisma.user.update({
      where: { email },
      data: { otp: null, otpExpiresAt: null },
    });
  }

  // Registration
  async register(dto: RegisterDto) {
    const existing = await this.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await this.hashPassword(dto.password);
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

    await this.mailService.sendRegistrationMail(dto.email, dto.name);
    await this.mailService.sendOtp(dto.email, dto.name, otp);
    return {
      message: 'Account created. Check your email for verification OTP.',
    };
  }

  // Login
  async login(dto: LoginDto) {
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await this.validatePasswordMatch(
      dto.password,
      user.password,
    );
    if (!isMatch) throw new BadRequestException('Invalid password');
    if (!user.isVerified) throw new BadRequestException('Email not verified');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '2 days',
    });

    await this.mailService.sendLoginMail(user.email, user.name ?? 'user');
    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // OTP Management
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    await this.validateOtp(user, dto.otp);

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
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    if (dto.context === 'register' && user.isVerified)
      throw new BadRequestException('Email already verified');

    const { otp } = await this.generateAndSaveOtp(dto.email);

    await this.mailService.sendOtp(user.email, user.name ?? 'user', otp);

    return { message: 'New OTP sent to your email' };
  }

  // Password Management
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    const { otp } = await this.generateAndSaveOtp(dto.email);

    await this.mailService.sendOtp(dto.email, user.name ?? 'user', otp);
    return { message: 'OTP sent to email for password reset' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.findUserByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    await this.validateOtp(user, dto.otp);

    const newHashed = await this.hashPassword(dto.newPassword);

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
    const user = await this.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await this.validatePasswordMatch(
      dto.currentPassword,
      user.password,
    );
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }
}

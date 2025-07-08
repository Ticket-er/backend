import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

jest.mock('jsonwebtoken', () => jest.requireActual('jsonwebtoken'));
jest.mock('../../generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockMailService = {
    sendOtp: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60,
              limit: 10,
            },
          ],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(bcrypt, 'hash').mockImplementation(() => 'hashedPassword');
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => true);
    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2025-07-08T00:00:00Z').getTime());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/register', () => {
    const registerDto: RegisterDto = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'Password123!',
    };

    it('should register a new user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        ...registerDto,
        password: 'hashedPassword',
        otp: '123456',
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
        isVerified: false,
      });
      mockMailService.sendOtp.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Account created. Check your email for verification OTP.',
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: registerDto.name,
          email: registerDto.email,
          password: 'hashedPassword',
          otp: expect.any(String),
          otpExpiresAt: expect.any(Date),
        }),
      });
      expect(mockMailService.sendOtp).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.name,
        expect.any(String),
      );
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: registerDto.email,
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toBe('Email already registered');
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle internal server error', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerDto)
        .expect(500);

      expect(response.body.message).toBe(
        'Internal Server Error: Try Again Later',
      );
    });
  });

  describe('POST /v1/auth/login', () => {
    const loginDto: LoginDto = {
      email: 'john.doe@example.com',
      password: 'Password123!',
    };

    it('should login user successfully and return JWT token', async () => {
      const user = {
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
        isVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('jwt_token');

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toEqual({ access_token: 'jwt_token' });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id, email: user.email },
        { secret: process.env.JWT_SECRET, expiresIn: '1d' },
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginDto)
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should throw BadRequestException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
        isVerified: true,
      });
      jest.spyOn(bcrypt, 'compare').mockImplementationOnce(() => false);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body.message).toBe('Invalid password');
    });

    it('should throw BadRequestException if email is not verified', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
        isVerified: false,
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body.message).toBe('Email not verified');
    });
  });

  describe('POST /v1/auth/verify-otp', () => {
    const verifyOtpDto: VerifyOtpDto = {
      email: 'john.doe@example.com',
      otp: '123456',
    };

    it('should verify OTP successfully', async () => {
      const user = {
        id: 1,
        email: verifyOtpDto.email,
        otp: verifyOtpDto.otp,
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
        isVerified: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        isVerified: true,
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(200);

      expect(response.body).toEqual({ message: 'Email verified successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email: verifyOtpDto.email },
        data: { isVerified: true, otp: null, otpExpiresAt: null },
      });
    });

    it('should throw NotFoundException if user or OTP is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(404);

      expect(response.body.message).toBe('Invalid request');
    });

    it('should throw BadRequestException if OTP is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: verifyOtpDto.email,
        otp: '654321',
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(400);

      expect(response.body.message).toBe('Incorrect OTP');
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: verifyOtpDto.email,
        otp: verifyOtpDto.otp,
        otpExpiresAt: new Date('2025-07-07T23:59:00Z'),
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/verify-otp')
        .send(verifyOtpDto)
        .expect(400);

      expect(response.body.message).toBe('OTP expired');
    });
  });

  describe('POST /v1/auth/resend-otp', () => {
    const resendOtpDto: ResendOtpDto = {
      email: 'john.doe@example.com',
      context: 'register',
    };

    it('should resend OTP successfully', async () => {
      const user = {
        id: 1,
        email: resendOtpDto.email,
        name: 'John Doe',
        isVerified: false,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        otp: '123456',
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
      });
      mockMailService.sendOtp.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/resend-otp')
        .send(resendOtpDto)
        .expect(200);

      expect(response.body).toEqual({ message: 'New OTP sent to your email' });
      expect(mockMailService.sendOtp).toHaveBeenCalledWith(
        resendOtpDto.email,
        'John Doe',
        expect.any(String),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/resend-otp')
        .send(resendOtpDto)
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });

    it('should throw BadRequestException if email is already verified for register context', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: resendOtpDto.email,
        isVerified: true,
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/resend-otp')
        .send(resendOtpDto)
        .expect(400);

      expect(response.body.message).toBe('Email already verified');
    });

    it('should allow resend OTP for forgot-password context even if verified', async () => {
      const user = {
        id: 1,
        email: resendOtpDto.email,
        name: 'John Doe',
        isVerified: true,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        otp: '123456',
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
      });
      mockMailService.sendOtp.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/resend-otp')
        .send({ ...resendOtpDto, context: 'forgot-password' })
        .expect(200);

      expect(response.body).toEqual({ message: 'New OTP sent to your email' });
    });
  });

  describe('POST /v1/auth/forgot-password', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'john.doe@example.com',
    };

    it('should send OTP for password reset successfully', async () => {
      const user = {
        id: 1,
        email: forgotPasswordDto.email,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        otp: '123456',
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
      });
      mockMailService.sendOtp.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(200);

      expect(response.body).toEqual({
        message: 'OTP sent to email for password reset',
      });
      expect(mockMailService.sendOtp).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        'user',
        expect.any(String),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(404);

      expect(response.body.message).toBe('User not found');
    });
  });

  describe('POST /v1/auth/reset-password', () => {
    const resetPasswordDto: ResetPasswordDto = {
      email: 'john.doe@example.com',
      otp: '123456',
      newPassword: 'NewPassword123!',
    };

    it('should reset password successfully', async () => {
      const user = {
        id: 1,
        email: resetPasswordDto.email,
        otp: resetPasswordDto.otp,
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
      };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.user.update.mockResolvedValue({
        ...user,
        password: 'hashedPassword',
        otp: null,
        otpExpiresAt: null,
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send(resetPasswordDto)
        .expect(200);

      expect(response.body).toEqual({ message: 'Password reset successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email: resetPasswordDto.email },
        data: {
          password: 'hashedPassword',
          otp: null,
          otpExpiresAt: null,
        },
      });
    });

    it('should throw BadRequestException if user or OTP is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send(resetPasswordDto)
        .expect(400);

      expect(response.body.message).toBe('Invalid reset request');
    });

    it('should throw BadRequestException if OTP is incorrect', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: resetPasswordDto.email,
        otp: '654321',
        otpExpiresAt: new Date('2025-07-08T00:15:00Z'),
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send(resetPasswordDto)
        .expect(400);

      expect(response.body.message).toBe('Incorrect OTP');
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: resetPasswordDto.email,
        otp: resetPasswordDto.otp,
        otpExpiresAt: new Date('2025-07-07T23:59:00Z'),
      });

      const response = await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send(resetPasswordDto)
        .expect(400);

      expect(response.body.message).toBe('OTP expired');
    });
  });
});

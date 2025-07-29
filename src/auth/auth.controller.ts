import {
  Controller,
  Post,
  Body,
  HttpCode,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtGuard } from './guards/jwt.guard';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and sends an OTP for email verification.',
  })
  @ApiBody({
    description: 'User registration data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'John Doe',
          description: 'User full name',
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address',
        },
        password: {
          type: 'string',
          example: 'Password123!',
          description: 'User password',
        },
      },
      required: ['name', 'email', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Account created. Check your email for verification OTP.',
    type: Object,
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 1, ttl: 60 } })
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns a JWT token.',
  })
  @ApiBody({
    description: 'User login credentials',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address',
        },
        password: {
          type: 'string',
          example: 'Password123!',
          description: 'User password',
        },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid password or email not verified',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('resend-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @ApiOperation({
    summary: 'Resend OTP',
    description: 'Resends an OTP for email verification or password reset.',
  })
  @ApiBody({
    description: 'Resend OTP request data',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address',
        },
        context: {
          type: 'string',
          enum: ['register', 'forgot-password'],
          example: 'register',
          description: 'Context for OTP (registration or password reset)',
        },
      },
      required: ['email', 'context'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'New OTP sent to your email',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Email already verified (for register context)',
  })
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify OTP',
    description:
      'Verifies the OTP sent to the user’s email for account activation.',
  })
  @ApiBody({
    description: 'OTP verification data',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address',
        },
        otp: {
          type: 'string',
          example: '123456',
          description: 'One-time password (OTP)',
        },
      },
      required: ['email', 'otp'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    type: Object,
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid request (user or OTP not found)',
  })
  @ApiResponse({ status: 400, description: 'Incorrect OTP or OTP expired' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Forgot password',
    description: 'Sends an OTP to the user’s email for password reset.',
  })
  @ApiBody({
    description: 'Forgot password request data',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent to email for password reset',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets the user’s password using the provided OTP.',
  })
  @ApiBody({
    description: 'Password reset data',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address',
        },
        otp: {
          type: 'string',
          example: '123456',
          description: 'One-time password (OTP)',
        },
        newPassword: {
          type: 'string',
          example: 'NewPassword123!',
          description: 'New user password',
        },
      },
      required: ['email', 'otp', 'newPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reset request, incorrect OTP, or OTP expired',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtGuard)
  @Post('change-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @ApiOperation({
    summary: 'Change password',
    description: 'Allows a logged-in user to change their password.',
  })
  @ApiBody({
    description: 'Current and new password data',
    schema: {
      type: 'object',
      properties: {
        currentPassword: {
          type: 'string',
          example: 'OldPass123!',
          description: 'User current password',
        },
        newPassword: {
          type: 'string',
          example: 'NewPass456!',
          description: 'User new password',
        },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect or invalid request',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    const userId = req.user.sub;
    return this.authService.changePassword(userId, dto);
  }
}

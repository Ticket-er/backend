import {
  Controller,
  Put,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Req,
  Patch,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('v1/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated user',
    description: 'Retrieves the details of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: { type: 'string', example: 'john.doe@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: {
              type: 'string',
              enum: ['USER', 'ORGANIZER', 'ADMIN', 'SUPERADMIN'],
              example: 'USER',
            },
            profileImage: {
              type: 'string',
              example: 'https://example.com/profile.jpg',
              nullable: true,
            },
            isVerified: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUser(@Req() req) {
    return this.userService.getCurrentUser(req.user.sub);
  }

  @Put('update')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Updates the authenticated user’s profile, including optional name, password, and profile image.',
  })
  @ApiBody({
    description: 'User update data and optional profile image upload',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'John Doe',
          description: 'Updated user name',
          nullable: true,
        },
        password: {
          type: 'string',
          example: 'NewPassword123!',
          description: 'New password (minimum 6 characters)',
          nullable: true,
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile image',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Password must be at least 6 characters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized: JWT token missing or invalid',
  })
  async updateProfile(
    @Body() dto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.userService.updateUser(req.user.sub, dto, file);
  }

  @Patch('become-organizer')
  @ApiOperation({
    summary: 'Promote user to organizer',
    description:
      'Promotes a user to an organizer role and creates a wallet if not already present.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'john.doe@example.com',
          description: 'User email',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User promoted to organizer or wallet created',
  })
  @ApiResponse({ status: 400, description: 'User is already an organizer' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async becomeOrganizer(@Body() body: { email: string }) {
    return this.userService.becomeOrganizer(body.email);
  }
}

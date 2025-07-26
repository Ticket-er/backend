import {
  Controller,
  Put,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Req,
  Patch,
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
  async becomeOrganizer(@Body() body: { email: string }) {
    return this.userService.becomeOrganizer(body.email);
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../login/guards/jwt-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';

@ApiTags('users')
@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.userId);
  }

  @Get('me/progress')
  @ApiOperation({ summary: 'Get current user overall progress' })
  getCurrentUserProgress(@Request() req: any) {
    return this.usersService.getCurrentUserProgress(req.user.userId);
  }

  @Post('me/progress/vocabulary')
  @ApiOperation({
    summary: 'Mark a vocabulary card as viewed for current user',
  })
  markVocabularyProgress(
    @Request() req: any,
    @Body()
    body: {
      learningUnitId: string;
      vocabularyCardId: string;
    },
  ) {
    return this.usersService.markVocabularyCardViewed(
      req.user.userId,
      body.learningUnitId,
      body.vocabularyCardId,
    );
  }

  @Patch('me/progress/learning-units/:learningUnitId')
  @ApiOperation({
    summary: 'Set vocab/listen toggle state for a learning unit',
  })
  setLearningUnitProgress(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Body()
    body: {
      field: 'vocab' | 'listen';
      completed: boolean;
    },
  ) {
    return this.usersService.setLearningUnitToggleProgress(
      req.user.userId,
      learningUnitId,
      body.field,
      body.completed,
    );
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update user profile (name, email)' })
  updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Update user password' })
  updatePassword(
    @Request() req: any,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(req.user.userId, updatePasswordDto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|svg\+xml|webp)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const avatarUrl = `/avatars/${file.filename}`;
    return this.usersService.updateAvatar(req.user.userId, avatarUrl);
  }

  @Get('me/listening-settings')
  @ApiOperation({ summary: 'Lấy cài đặt luyện nghe' })
  getListeningSettings(@Request() req: any) {
    return this.usersService.getListeningSettings(req.user.userId);
  }

  @Put('me/listening-settings')
  @ApiOperation({ summary: 'Cập nhật cài đặt luyện nghe' })
  updateListeningSettings(
    @Request() req: any,
    @Body()
    updateDto: import('./dto/update-listening-settings.dto.js').UpdateListeningSettingsDto,
  ) {
    return this.usersService.updateListeningSettings(
      req.user.userId,
      updateDto,
    );
  }
}

import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../login/guards/jwt-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import { UpdateLearningUnitProgressDto } from './dto/update-learning-unit-progress.dto.js';

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

  @Get('me/progress')
  @ApiOperation({ summary: 'Get overall learning progress' })
  @ApiOkResponse({ description: 'Overall progress counts and per-unit status' })
  getOverallProgress(@Request() req: any) {
    return this.usersService.getOverallProgress(req.user.userId);
  }

  @Patch('me/progress/learning-units/:learningUnitId')
  @ApiOperation({
    summary: 'Toggle vocab/listening progress for a learning unit',
  })
  @ApiParam({ name: 'learningUnitId', description: 'Learning unit id' })
  @ApiOkResponse({
    description: 'Updated overall progress counts and per-unit status',
  })
  updateLearningUnitProgress(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Body() updateDto: UpdateLearningUnitProgressDto,
  ) {
    return this.usersService.updateLearningUnitProgress(
      req.user.userId,
      learningUnitId,
      updateDto,
    );
  }

  @Patch('me/progress/vocabulary-units/:learningUnitId/cards/:cardId')
  @ApiOperation({ summary: 'Mark a vocabulary card as viewed' })
  @ApiParam({ name: 'learningUnitId', description: 'Learning unit id' })
  @ApiParam({ name: 'cardId', description: 'Vocabulary card id' })
  @ApiOkResponse({
    description: 'Updated vocabulary progress for the learning unit',
  })
  markVocabularyCardViewed(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.usersService.markVocabularyCardViewed(
      req.user.userId,
      learningUnitId,
      cardId,
    );
  }
}

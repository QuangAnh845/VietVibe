import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { AudioProcessingQueryDto } from './dto/audio-processing-query.dto';
import { CreateListeningDto } from './dto/create-listening.dto';
import { CreateLearningUnitDto } from './dto/create-learning-unit.dto';
import { CreatePlaceDto } from './dto/create-place.dto';
import { CreateSituationDto } from './dto/create-situation.dto';
import { StartListeningSessionDto } from './dto/start-listening-session.dto';
import { UpdateLearningUnitDto } from './dto/update-learning-unit.dto';
import { UpdateListeningDto } from './dto/update-listening.dto';
import { UpdateListeningSessionDto } from './dto/update-listening-session.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpdateSituationDto } from './dto/update-situation.dto';
import { ListeningService } from './listening.service';
import { JwtAuthGuard } from '../login/guards/jwt-auth.guard.js';
import { RolesGuard } from '../login/guards/roles.guard.js';
import { Roles } from '../login/decorators/roles.decorator.js';

@ApiTags('Listening')
@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(201)
  @ApiOperation({
    summary: '[ADMIN] Create a listening lesson',
    description: 'Only admin can create a listening lesson',
  })
  @ApiCreatedResponse({ description: 'Listening lesson created successfully' })
  createListeningLesson(@Body() createDto: CreateListeningDto) {
    return this.listeningService.createListeningLesson(createDto);
  }

  @Post('admin/upload-audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Upload audio file' })
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
  @ApiOkResponse({ description: 'Audio uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/audios',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          
          let decodedName = file.originalname;
          try {
            decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch (e) {}

          const extension = extname(decodedName).toLowerCase();
          let baseName = decodedName.substring(0, decodedName.length - extension.length);
          // Replace spaces and special characters with underscore to avoid URL issues
          baseName = baseName.replace(/[^a-zA-Z0-9\u0080-\uFFFF_-]/g, '_');
          
          cb(null, `${baseName}-${uniqueSuffix}${extension}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        const allowedExt = ['.mp3', '.wav', '.m4a'];
        const allowedMime = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/mp4',
          'audio/x-m4a',
        ];
        const extension = extname(file.originalname).toLowerCase();

        if (!allowedExt.includes(extension) || !allowedMime.includes(file.mimetype)) {
          return cb(
            new BadRequestException('Only mp3/wav/m4a files are allowed'),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      audioUrl: `/audios/${file.filename}`,
    };
  }

  @Delete('admin/delete-audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Delete an uploaded audio file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string' },
      },
    },
  })
  async deleteAudioFile(@Body('audioUrl') audioUrl: string) {
    if (!audioUrl) {
      throw new BadRequestException('audioUrl is required');
    }

    if (!audioUrl.startsWith('/audios/') || audioUrl.includes('..')) {
      throw new BadRequestException('Invalid audioUrl');
    }

    const fileName = audioUrl.replace('/audios/', '');
    const filePath = join(__dirname, '..', '..', 'public', 'audios', fileName);

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        return { success: true };
      } else {
        throw new NotFoundException('Audio file not found');
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete audio file: ${error.message}`);
    }
  }

  @Post('admin/places')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(201)
  @ApiOperation({ summary: '[ADMIN] Create a place' })
  @ApiCreatedResponse({ description: 'Place created successfully' })
  createPlace(@Body() createDto: CreatePlaceDto) {
    return this.listeningService.createPlace(createDto);
  }

  @Put('admin/places/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Update a place' })
  @ApiParam({ name: 'id', description: 'Place id' })
  @ApiOkResponse({ description: 'Place updated successfully' })
  updatePlace(@Param('id') id: string, @Body() updateDto: UpdatePlaceDto) {
    return this.listeningService.updatePlace(id, updateDto);
  }

  @Delete('admin/places/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Delete a place' })
  @ApiParam({ name: 'id', description: 'Place id' })
  @ApiOkResponse({ description: 'Place deleted successfully' })
  deletePlace(@Param('id') id: string) {
    return this.listeningService.deletePlace(id);
  }

  @Post('admin/situations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(201)
  @ApiOperation({ summary: '[ADMIN] Create a situation' })
  @ApiCreatedResponse({ description: 'Situation created successfully' })
  createSituation(@Body() createDto: CreateSituationDto) {
    return this.listeningService.createSituation(createDto);
  }

  @Put('admin/situations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Update a situation' })
  @ApiParam({ name: 'id', description: 'Situation id' })
  @ApiOkResponse({ description: 'Situation updated successfully' })
  updateSituation(
    @Param('id') id: string,
    @Body() updateDto: UpdateSituationDto,
  ) {
    return this.listeningService.updateSituation(id, updateDto);
  }

  @Delete('admin/situations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Delete a situation' })
  @ApiParam({ name: 'id', description: 'Situation id' })
  @ApiOkResponse({ description: 'Situation deleted successfully' })
  deleteSituation(@Param('id') id: string) {
    return this.listeningService.deleteSituation(id);
  }

  @Get('admin/learning-units')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Get all learning units' })
  @ApiOkResponse({ description: 'List of learning units' })
  getAllLearningUnits() {
    return this.listeningService.getAllLearningUnits();
  }

  @Post('admin/learning-units')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(201)
  @ApiOperation({ summary: '[ADMIN] Create a learning unit' })
  @ApiCreatedResponse({ description: 'Learning unit created successfully' })
  createLearningUnit(@Body() createDto: CreateLearningUnitDto) {
    return this.listeningService.createLearningUnit(createDto);
  }

  @Put('admin/learning-units/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Update a learning unit' })
  @ApiParam({ name: 'id', description: 'Learning unit id' })
  @ApiOkResponse({ description: 'Learning unit updated successfully' })
  updateLearningUnit(
    @Param('id') id: string,
    @Body() updateDto: UpdateLearningUnitDto,
  ) {
    return this.listeningService.updateLearningUnit(id, updateDto);
  }

  @Delete('admin/learning-units/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: '[ADMIN] Delete a learning unit' })
  @ApiParam({ name: 'id', description: 'Learning unit id' })
  @ApiOkResponse({ description: 'Learning unit deleted successfully' })
  deleteLearningUnit(@Param('id') id: string) {
    return this.listeningService.deleteLearningUnit(id);
  }

  @Get('places')
  @ApiOperation({ summary: 'Get all places' })
  @ApiOkResponse({ description: 'List of places' })
  getAllPlaces() {
    return this.listeningService.getAllPlaces();
  }

  @Get('places/:placeId/full')
  @ApiOperation({ summary: 'Get place with situations and learning units' })
  @ApiParam({ name: 'placeId', description: 'Place id' })
  @ApiOkResponse({ description: 'Place hierarchy' })
  @ApiNotFoundResponse({ description: 'Place not found' })
  getPlaceFull(@Param('placeId') placeId: string) {
    return this.listeningService.getPlaceFull(placeId);
  }

  @Get('places/:placeId/situations')
  @ApiOperation({ summary: 'Get situations by place id' })
  @ApiParam({ name: 'placeId', description: 'Place id' })
  @ApiOkResponse({ description: 'List of situations for the place' })
  @ApiNotFoundResponse({ description: 'Place not found' })
  getSituationsByPlaceId(@Param('placeId') placeId: string) {
    return this.listeningService.getSituationsByPlaceId(placeId);
  }

  @Get('situations/:situationId/learning-units')
  @ApiOperation({ summary: 'Get learning units by situation id' })
  @ApiParam({ name: 'situationId', description: 'Situation id' })
  @ApiOkResponse({ description: 'List of learning units for the situation' })
  @ApiNotFoundResponse({ description: 'Situation not found' })
  getLearningUnitsBySituationId(@Param('situationId') situationId: string) {
    return this.listeningService.getLearningUnitsBySituationId(situationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all listening lessons' })
  @ApiOkResponse({ description: 'List of listening lessons' })
  getAllListeningLessons() {
    return this.listeningService.getAllListeningLessons();
  }

  @Get('learning-unit/:learningUnitId')
  @ApiOperation({ summary: 'Get listening lesson by learning unit id' })
  @ApiParam({ name: 'learningUnitId', description: 'Learning unit id' })
  @ApiOkResponse({ description: 'Listening lesson for the learning unit' })
  @ApiNotFoundResponse({ description: 'Listening lesson not found' })
  getListeningLessonByLearningUnit(
    @Param('learningUnitId') learningUnitId: string,
  ) {
    return this.listeningService.getListeningLessonByLearningUnit(
      learningUnitId,
    );
  }

  @Post('sessions/:sessionId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Complete a listening session and persist listening progress',
  })
  @ApiParam({ name: 'sessionId', description: 'Listening session id' })
  @ApiOkResponse({ description: 'Completed listening session state' })
  @ApiNotFoundResponse({ description: 'Listening session not found' })
  completeListeningSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.listeningService.completeListeningSession(
      sessionId,
      req.user.userId,
    );
  }

  @Get('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Get a listening session with audio processing state',
  })
  @ApiParam({ name: 'sessionId', description: 'Listening session id' })
  @ApiOkResponse({ description: 'Listening session state' })
  @ApiNotFoundResponse({ description: 'Listening session not found' })
  getListeningSessionById(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.listeningService.getListeningSessionById(
      sessionId,
      req.user.userId,
    );
  }

  @Patch('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Update listening session position/settings' })
  @ApiParam({ name: 'sessionId', description: 'Listening session id' })
  @ApiOkResponse({ description: 'Updated listening session state' })
  @ApiNotFoundResponse({ description: 'Listening session not found' })
  updateListeningSession(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateListeningSessionDto,
    @Request() req: any,
  ) {
    return this.listeningService.updateListeningSession(
      sessionId,
      req.user.userId,
      updateDto,
    );
  }

  @Get(':id/audio-processing')
  @ApiOperation({
    summary: 'Build audio processing plan for a listening lesson',
    description:
      'Returns transcript segments, current segment, speed/mode, and ambient-mix metadata for the FE audio player.',
  })
  @ApiParam({ name: 'id', description: 'Listening lesson id' })
  @ApiOkResponse({
    description: 'Audio processing plan with transcript segments',
  })
  @ApiNotFoundResponse({ description: 'Listening lesson not found' })
  getAudioProcessingPlan(
    @Param('id') id: string,
    @Query() query: AudioProcessingQueryDto,
  ) {
    return this.listeningService.getAudioProcessingPlan(id, query);
  }

  @Get(':id/sessions/latest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Get latest listening session for a lesson and learner',
  })
  @ApiParam({ name: 'id', description: 'Listening lesson id' })
  @ApiOkResponse({ description: 'Latest listening session state' })
  @ApiNotFoundResponse({ description: 'Listening session not found' })
  getLatestListeningSession(@Param('id') id: string, @Request() req: any) {
    return this.listeningService.getLatestListeningSession(id, req.user.userId);
  }

  @Post(':id/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Start a listening session for a lesson',
    description:
      'Creates a session, resumes from saved progress when no initial position is passed, and returns audio processing state.',
  })
  @ApiParam({ name: 'id', description: 'Listening lesson id' })
  @ApiCreatedResponse({ description: 'Started listening session state' })
  @ApiNotFoundResponse({ description: 'Listening lesson or user not found' })
  startListeningSession(
    @Param('id') id: string,
    @Body() startDto: StartListeningSessionDto,
    @Request() req: any,
  ) {
    return this.listeningService.startListeningSession(
      id,
      req.user.userId,
      startDto,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listening lesson by id' })
  @ApiParam({ name: 'id', description: 'Listening lesson id' })
  @ApiOkResponse({ description: 'Listening lesson with transcript lines' })
  @ApiNotFoundResponse({ description: 'Listening lesson not found' })
  getListeningLessonById(@Param('id') id: string) {
    return this.listeningService.getListeningLessonById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: '[ADMIN] Update a listening lesson',
    description: 'Only admin can update listening lessons',
  })
  @ApiParam({ name: 'id', description: 'Listening lesson id' })
  @ApiOkResponse({ description: 'Updated listening lesson' })
  @ApiNotFoundResponse({ description: 'Listening lesson not found' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  updateListeningLesson(
    @Param('id') id: string,
    @Body() updateListeningDto: UpdateListeningDto,
  ) {
    return this.listeningService.updateListeningLesson(id, updateListeningDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: '[ADMIN] Delete a listening lesson',
    description: 'Only admin can delete listening lessons',
  })
  @ApiParam({ name: 'id', description: 'Listening lesson id' })
  @ApiOkResponse({ description: 'Deleted listening lesson' })
  @ApiNotFoundResponse({ description: 'Listening lesson not found' })
  deleteListeningLesson(@Param('id') id: string) {
    return this.listeningService.deleteListeningLesson(id);
  }
}

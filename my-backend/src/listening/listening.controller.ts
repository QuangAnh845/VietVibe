import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AudioProcessingQueryDto } from './dto/audio-processing-query.dto';
import { CreateListeningDto } from './dto/create-listening.dto';

import { StartListeningSessionDto } from './dto/start-listening-session.dto';
import { UpdateListeningDto } from './dto/update-listening.dto';
import { UpdateListeningSessionDto } from './dto/update-listening-session.dto';
import { ListeningService } from './listening.service';
import { JwtAuthGuard } from '../login/guards/jwt-auth.guard.js';
import { RolesGuard } from '../login/guards/roles.guard.js';
import { Roles } from '../login/decorators/roles.decorator.js';

@ApiTags('Listening')
@Controller('listening')
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Get('places')
  @ApiOperation({ summary: 'Get all places' })
  @ApiOkResponse({ description: 'List of places' })
  getAllPlaces() {
    return this.listeningService.getAllPlaces();
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
  completeListeningSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.listeningService.completeListeningSession(sessionId, req.user.userId);
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
  getListeningSessionById(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.listeningService.getListeningSessionById(sessionId, req.user.userId);
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
    return this.listeningService.updateListeningSession(sessionId, req.user.userId, updateDto);
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
  getLatestListeningSession(
    @Param('id') id: string,
    @Request() req: any,
  ) {
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
    return this.listeningService.startListeningSession(id, req.user.userId, startDto);
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

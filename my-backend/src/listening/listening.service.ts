import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as path from 'path';
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
import {
  AMBIENT_SOUNDS,
  DEFAULT_AMBIENT_SOUND,
  DEFAULT_AMBIENT_VOLUME,
  DEFAULT_PLAYBACK_MODE,
  DEFAULT_PLAYBACK_SPEED,
  PLAYBACK_MODES,
  PLAYBACK_SPEEDS,
  normalizeAmbientSound,
  normalizeAmbientVolume,
  normalizePlaybackMode,
  normalizePlaybackSpeed,
  type AmbientSound,
  type PlaybackMode,
  type PlaybackSpeed,
} from './listening-session.constants';

const models = require(path.resolve(__dirname, '../../src/models'));
const mongoose = require('mongoose');
const { Types } = mongoose;

const {
  Place,
  Situation,
  Level,
  LearningUnit,
  ListeningLesson,
  ListeningSession,
  TranscriptLine,
  User,
  UserProgress,
  VocabularyCard,
} = models;

const COMPLETION_THRESHOLD_SECONDS = 1;

type SessionSettings = {
  playbackSpeed: PlaybackSpeed;
  playbackMode: PlaybackMode;
  ambientSound: AmbientSound | null;
  ambientVolume: number;
};

@Injectable()
export class ListeningService {
  async getAllPlaces() {
    const places = await Place.find().sort({ created_at: 1 });
    return places.map((place) => this.mapPlace(place));
  }

  async getSituationsByPlaceId(placeId: string) {
    const placeObjectId = this.toObjectId(placeId);
    const place = await Place.findById(placeObjectId);
    if (!place) {
      throw new NotFoundException('Không tìm thấy địa điểm.');
    }

    const situations = await Situation.find({ place_id: placeObjectId }).sort({
      created_at: 1,
    });

    return situations.map((situation) => this.mapSituation(situation));
  }

  async getPlaceFull(placeId: string) {
    const placeObjectId = this.toObjectId(placeId);
    const place = await Place.findById(placeObjectId);
    if (!place) {
      throw new NotFoundException('Không tìm thấy địa điểm.');
    }

    const situations = await Situation.find({ place_id: placeObjectId }).sort({
      created_at: 1,
    });

    const situationIds = situations.map((situation) => situation._id);

    // Fetch all learning units and their levels in a single query with populate
    const learningUnits = await LearningUnit.find({
      situation_id: { $in: situationIds },
    })
      .populate('level_id')
      .sort({ created_at: 1 });

    // Group learning units by situation_id in memory
    const unitsBySituation = new Map<string, any[]>();
    for (const unit of learningUnits) {
      const sitId = String(unit.situation_id);
      let arr = unitsBySituation.get(sitId);
      if (!arr) {
        arr = [];
        unitsBySituation.set(sitId, arr);
      }
      arr.push(this.mapLearningUnit(unit, unit.level_id));
    }

    const situationsWithUnits = situations.map((situation) => {
      const sitId = String(situation._id);
      return {
        ...this.mapSituation(situation),
        learningUnits: unitsBySituation.get(sitId) ?? [],
      };
    });

    return {
      ...this.mapPlace(place),
      situations: situationsWithUnits,
    };
  }

  async getLearningUnitsBySituationId(situationId: string) {
    const situationObjectId = this.toObjectId(situationId);
    const situation = await Situation.findById(situationObjectId);
    if (!situation) {
      throw new NotFoundException('Không tìm thấy tình huống.');
    }

    const learningUnits = await LearningUnit.find({
      situation_id: situationObjectId,
    })
      .populate('level_id')
      .sort({ created_at: 1 });

    return learningUnits.map((unit) => this.mapLearningUnit(unit, unit.level_id));
  }

  async getAllListeningLessons() {
    return ListeningLesson.find().sort({ created_at: 1 });
  }

  async getAllSituations() {
    const situations = await Situation.find().sort({ created_at: 1 });
    return situations.map((situation) => this.mapSituation(situation));
  }

  async getAllLearningUnits() {
    const units = await LearningUnit.find()
      .populate('level_id')
      .sort({ created_at: 1 });

    return units.map((unit) => this.mapLearningUnit(unit, unit.level_id));
  }

  async createPlace(createDto: CreatePlaceDto) {
    const place = await Place.create({
      name_vi: createDto.nameVi,
      name_ja: createDto.nameJa,
      description: createDto.description ?? null,
      avatar_url: createDto.avatarUrl ?? null,
    });

    return this.mapPlace(place);
  }

  async updatePlace(id: string, updateDto: UpdatePlaceDto) {
    const placeId = this.toObjectId(id);
    const place = await Place.findById(placeId);
    if (!place) {
      throw new NotFoundException('Không tìm thấy địa điểm để cập nhật.');
    }

    const updatePayload: Record<string, unknown> = {};
    if (updateDto.nameVi !== undefined) {
      updatePayload.name_vi = updateDto.nameVi;
    }
    if (updateDto.nameJa !== undefined) {
      updatePayload.name_ja = updateDto.nameJa;
    }
    if (updateDto.description !== undefined) {
      updatePayload.description = updateDto.description;
    }
    if (updateDto.avatarUrl !== undefined) {
      updatePayload.avatar_url = updateDto.avatarUrl;
    }

    const updatedPlace = await Place.findByIdAndUpdate(placeId, updatePayload, {
      returnDocument: 'after',
    });

    return this.mapPlace(updatedPlace);
  }

  async deletePlace(id: string) {
    const placeId = this.toObjectId(id);
    const place = await Place.findByIdAndDelete(placeId);
    if (!place) {
      throw new NotFoundException('Không tìm thấy địa điểm để xóa.');
    }

    const situations = await Situation.find({ place_id: placeId });
    const situationIds = situations.map((situation) => situation._id);
    const learningUnits = await LearningUnit.find({
      situation_id: { $in: situationIds },
    });
    const learningUnitIds = learningUnits.map((unit) => unit._id);

    await this.deleteLearningUnitDependencies(learningUnitIds);
    await LearningUnit.deleteMany({ situation_id: { $in: situationIds } });
    await Situation.deleteMany({ place_id: placeId });

    return { deleted: true };
  }

  async createSituation(createDto: CreateSituationDto) {
    const place = await Place.findById(this.toObjectId(createDto.placeId));
    if (!place) {
      throw new NotFoundException('Không tìm thấy địa điểm.');
    }

    const situation = await Situation.create({
      place_id: createDto.placeId,
      title_vi: createDto.titleVi,
      title_ja: createDto.titleJa,
      description: createDto.description ?? null,
    });

    return this.mapSituation(situation);
  }

  async updateSituation(id: string, updateDto: UpdateSituationDto) {
    const situationId = this.toObjectId(id);
    const situation = await Situation.findById(situationId);
    if (!situation) {
      throw new NotFoundException('Không tìm thấy tình huống để cập nhật.');
    }

    if (updateDto.placeId) {
      const place = await Place.findById(this.toObjectId(updateDto.placeId));
      if (!place) {
        throw new NotFoundException('Không tìm thấy địa điểm.');
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (updateDto.placeId !== undefined) {
      updatePayload.place_id = updateDto.placeId;
    }
    if (updateDto.titleVi !== undefined) {
      updatePayload.title_vi = updateDto.titleVi;
    }
    if (updateDto.titleJa !== undefined) {
      updatePayload.title_ja = updateDto.titleJa;
    }
    if (updateDto.description !== undefined) {
      updatePayload.description = updateDto.description;
    }

    const updatedSituation = await Situation.findByIdAndUpdate(
      situationId,
      updatePayload,
      { returnDocument: 'after' },
    );

    return this.mapSituation(updatedSituation);
  }

  async deleteSituation(id: string) {
    const situationId = this.toObjectId(id);
    const situation = await Situation.findByIdAndDelete(situationId);
    if (!situation) {
      throw new NotFoundException('Không tìm thấy tình huống để xóa.');
    }

    const learningUnits = await LearningUnit.find({
      situation_id: situationId,
    });
    const learningUnitIds = learningUnits.map((unit) => unit._id);

    await this.deleteLearningUnitDependencies(learningUnitIds);
    await LearningUnit.deleteMany({ situation_id: situationId });

    return { deleted: true };
  }

  async createLearningUnit(createDto: CreateLearningUnitDto) {
    const situation = await Situation.findById(
      this.toObjectId(createDto.situationId),
    );
    if (!situation) {
      throw new NotFoundException('Không tìm thấy tình huống.');
    }

    const level = await Level.findById(this.toObjectId(createDto.levelId));
    if (!level) {
      throw new NotFoundException('Không tìm thấy level.');
    }

    const existingUnit = await LearningUnit.findOne({
      situation_id: createDto.situationId,
      level_id: createDto.levelId,
    });
    if (existingUnit) {
      throw new BadRequestException(
        'Learning unit đã tồn tại cho tình huống và level này.',
      );
    }

    const learningUnit = await LearningUnit.create({
      situation_id: createDto.situationId,
      level_id: createDto.levelId,
      title_vi: createDto.titleVi,
      title_ja: createDto.titleJa,
      description: createDto.description ?? null,
    });

    return this.mapLearningUnit(learningUnit, level);
  }

  async updateLearningUnit(id: string, updateDto: UpdateLearningUnitDto) {
    const unitId = this.toObjectId(id);
    const learningUnit = await LearningUnit.findById(unitId);
    if (!learningUnit) {
      throw new NotFoundException('Không tìm thấy learning unit để cập nhật.');
    }

    const nextSituationId =
      updateDto.situationId ?? String(learningUnit.situation_id);
    const nextLevelId = updateDto.levelId ?? String(learningUnit.level_id);

    if (updateDto.situationId) {
      const situation = await Situation.findById(
        this.toObjectId(updateDto.situationId),
      );
      if (!situation) {
        throw new NotFoundException('Không tìm thấy tình huống.');
      }
    }

    if (updateDto.levelId) {
      const level = await Level.findById(this.toObjectId(updateDto.levelId));
      if (!level) {
        throw new NotFoundException('Không tìm thấy level.');
      }
    }

    const duplicate = await LearningUnit.findOne({
      _id: { $ne: unitId },
      situation_id: nextSituationId,
      level_id: nextLevelId,
    });
    if (duplicate) {
      throw new BadRequestException(
        'Learning unit đã tồn tại cho tình huống và level này.',
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (updateDto.situationId !== undefined) {
      updatePayload.situation_id = updateDto.situationId;
    }
    if (updateDto.levelId !== undefined) {
      updatePayload.level_id = updateDto.levelId;
    }
    if (updateDto.titleVi !== undefined) {
      updatePayload.title_vi = updateDto.titleVi;
    }
    if (updateDto.titleJa !== undefined) {
      updatePayload.title_ja = updateDto.titleJa;
    }
    if (updateDto.description !== undefined) {
      updatePayload.description = updateDto.description;
    }

    const updatedLearningUnit = await LearningUnit.findByIdAndUpdate(
      unitId,
      updatePayload,
      { returnDocument: 'after' },
    );

    const level = await Level.findById(updatedLearningUnit.level_id);
    return this.mapLearningUnit(updatedLearningUnit, level);
  }

  async deleteLearningUnit(id: string) {
    const unitId = this.toObjectId(id);
    const learningUnit = await LearningUnit.findByIdAndDelete(unitId);
    if (!learningUnit) {
      throw new NotFoundException('Không tìm thấy learning unit để xóa.');
    }

    await this.deleteLearningUnitDependencies([unitId]);
    return { deleted: true };
  }

  async getListeningLessonById(id: string) {
    const lesson = await this.findLessonOrThrow(id);
    const transcriptLines = await this.getTranscriptLines(lesson._id);

    return {
      ...lesson.toObject(),
      transcriptLines,
    };
  }

  async getListeningLessonByLearningUnit(learningUnitId: string) {
    const lesson = await ListeningLesson.findOne({
      learning_unit_id: this.toObjectId(learningUnitId),
    });
    if (!lesson) {
      throw new NotFoundException(
        'Không tìm thấy bài nghe cho learningUnitId này.',
      );
    }

    const transcriptLines = await this.getTranscriptLines(lesson._id);

    return {
      ...lesson.toObject(),
      transcriptLines,
    };
  }

  async createListeningLesson(createDto: CreateListeningDto) {
    const learningUnit = await LearningUnit.findById(createDto.learningUnitId);
    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    const lesson = await ListeningLesson.create({
      learning_unit_id: createDto.learningUnitId,
      title_vi: createDto.titleVi,
      title_ja: createDto.titleJa,
      audio_url: createDto.audioUrl,
      duration_seconds: createDto.durationSeconds,
      description: createDto.description,
    });

    if (createDto.transcriptLines?.length) {
      const transcriptData = createDto.transcriptLines.map((line) => ({
        lesson_id: lesson._id,
        start_time: line.startTime,
        end_time: line.endTime,
        text_vi: line.textVi,
        text_ja: line.textJa,
      }));
      await TranscriptLine.insertMany(transcriptData);
    }

    return this.getListeningLessonById(String(lesson._id));
  }

  async updateListeningLesson(id: string, updateDto: UpdateListeningDto) {
    const updatePayload: Record<string, unknown> = {};
    if (updateDto.learningUnitId) {
      const learningUnit = await LearningUnit.findById(
        updateDto.learningUnitId,
      );
      if (!learningUnit) {
        throw new NotFoundException('Learning unit not found');
      }

      updatePayload.learning_unit_id = updateDto.learningUnitId;
    }
    if (updateDto.titleVi !== undefined) {
      updatePayload.title_vi = updateDto.titleVi;
    }
    if (updateDto.titleJa !== undefined) {
      updatePayload.title_ja = updateDto.titleJa;
    }
    if (updateDto.audioUrl !== undefined) {
      updatePayload.audio_url = updateDto.audioUrl;
    }
    if (updateDto.durationSeconds !== undefined) {
      updatePayload.duration_seconds = updateDto.durationSeconds;
    }
    if (updateDto.description !== undefined) {
      updatePayload.description = updateDto.description;
    }

    const lessonId = this.toObjectId(id);
    const lesson = await ListeningLesson.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài nghe để cập nhật.');
    }

    await ListeningLesson.findByIdAndUpdate(lessonId, updatePayload, {
      returnDocument: 'after',
    });

    if (updateDto.transcriptLines) {
      await TranscriptLine.deleteMany({ lesson_id: lessonId });
      if (updateDto.transcriptLines.length) {
        const transcriptData = updateDto.transcriptLines.map((line) => ({
          lesson_id: lessonId,
          start_time: line.startTime,
          end_time: line.endTime,
          text_vi: line.textVi,
          text_ja: line.textJa,
        }));
        await TranscriptLine.insertMany(transcriptData);
      }
    }

    return this.getListeningLessonById(id);
  }

  async deleteListeningLesson(id: string) {
    const lessonId = this.toObjectId(id);
    const lesson = await ListeningLesson.findByIdAndDelete(lessonId);
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài nghe để xóa.');
    }

    await TranscriptLine.deleteMany({ lesson_id: lessonId });
    await ListeningSession.deleteMany({ lesson_id: lessonId });
    return { deleted: true };
  }

  async getAudioProcessingPlan(id: string, query: AudioProcessingQueryDto) {
    const lesson = await this.findLessonOrThrow(id);
    const transcriptLines = await this.getTranscriptLines(lesson._id);
    const settings = this.resolveSessionSettings(query);
    const currentPositionSeconds = this.resolvePlaybackPosition({
      durationSeconds: lesson.duration_seconds,
      transcriptLineId: query.transcriptLineId,
      transcriptLines,
      fallbackPositionSeconds: 0,
      requestedPositionSeconds: query.currentPositionSeconds,
    });

    return this.buildAudioProcessingPlan(
      lesson,
      transcriptLines,
      currentPositionSeconds,
      settings,
    );
  }

  async startListeningSession(
    id: string,
    userIdString: string,
    startDto: StartListeningSessionDto,
  ) {
    const lesson = await this.findLessonOrThrow(id);
    const userId = this.toObjectId(userIdString);
    await this.findUserOrThrow(userId);

    const existingProgress = await UserProgress.findOne({
      user_id: userId,
      learning_unit_id: lesson.learning_unit_id,
    });
    const savedPositionSeconds =
      existingProgress?.listening_progress?.last_position_seconds ?? 0;
    const transcriptLines = await this.getTranscriptLines(lesson._id);
    const currentPositionSeconds = this.resolvePlaybackPosition({
      durationSeconds: lesson.duration_seconds,
      transcriptLines,
      fallbackPositionSeconds: savedPositionSeconds,
      requestedPositionSeconds: startDto.currentPositionSeconds,
    });
    const currentLine = this.findCurrentTranscriptLine(
      transcriptLines,
      currentPositionSeconds,
    );
    const settings = this.resolveSessionSettings(startDto);

    const session = await ListeningSession.create({
      user_id: userId,
      lesson_id: lesson._id,
      learning_unit_id: lesson.learning_unit_id,
      playback_speed: settings.playbackSpeed,
      playback_mode: settings.playbackMode,
      ambient_sound: settings.ambientSound,
      ambient_volume: settings.ambientVolume,
      last_position_seconds: currentPositionSeconds,
      current_transcript_line_id: currentLine?._id ?? null,
    });

    await this.persistListeningProgress({
      userId,
      learningUnitId: lesson.learning_unit_id,
      lessonId: lesson._id,
      currentPositionSeconds,
      completed: false,
    });

    return this.buildSessionResponse(session, lesson, transcriptLines);
  }

  async getLatestListeningSession(id: string, userIdValue: string) {
    const lesson = await this.findLessonOrThrow(id);
    const userId = this.toObjectId(userIdValue);
    await this.findUserOrThrow(userId);

    const session = await ListeningSession.findOne({
      user_id: userId,
      lesson_id: lesson._id,
    }).sort({ created_at: -1 });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên nghe gần nhất.');
    }

    const transcriptLines = await this.getTranscriptLines(lesson._id);
    return this.buildSessionResponse(session, lesson, transcriptLines);
  }

  async getListeningSessionById(sessionId: string, userIdString: string) {
    const session = await this.findSessionOrThrow(sessionId, userIdString);
    const lesson = await this.findLessonOrThrow(String(session.lesson_id));
    const transcriptLines = await this.getTranscriptLines(lesson._id);

    return this.buildSessionResponse(session, lesson, transcriptLines);
  }

  async updateListeningSession(
    sessionId: string,
    userIdString: string,
    updateDto: UpdateListeningSessionDto,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userIdString);
    const lesson = await this.findLessonOrThrow(String(session.lesson_id));
    const transcriptLines = await this.getTranscriptLines(lesson._id);
    const settings = this.resolveSessionSettings(updateDto, {
      playbackSpeed: session.playback_speed,
      playbackMode: session.playback_mode,
      ambientSound: session.ambient_sound,
      ambientVolume: session.ambient_volume,
    });

    let currentPositionSeconds = this.resolvePlaybackPosition({
      durationSeconds: lesson.duration_seconds,
      transcriptLineId: updateDto.transcriptLineId,
      transcriptLines,
      fallbackPositionSeconds: session.last_position_seconds ?? 0,
      requestedPositionSeconds: updateDto.currentPositionSeconds,
    });

    const completed =
      updateDto.completed === true ||
      this.isLessonCompleted(currentPositionSeconds, lesson.duration_seconds);

    if (completed) {
      currentPositionSeconds = lesson.duration_seconds;
    }

    const currentLine = this.findCurrentTranscriptLine(
      transcriptLines,
      currentPositionSeconds,
    );

    session.playback_speed = settings.playbackSpeed;
    session.playback_mode = settings.playbackMode;
    session.ambient_sound = settings.ambientSound;
    session.ambient_volume = settings.ambientVolume;
    session.last_position_seconds = currentPositionSeconds;
    session.current_transcript_line_id = currentLine?._id ?? null;

    if (completed) {
      session.completed = true;
      session.completed_at = session.completed_at ?? new Date();
      session.ended_at = session.ended_at ?? new Date();
    }

    await session.save();
    await this.persistListeningProgress({
      userId: session.user_id,
      learningUnitId: lesson.learning_unit_id,
      lessonId: lesson._id,
      currentPositionSeconds,
      completed,
    });

    return this.buildSessionResponse(session, lesson, transcriptLines);
  }

  async completeListeningSession(sessionId: string, userIdString: string) {
    const session = await this.findSessionOrThrow(sessionId, userIdString);
    const lesson = await this.findLessonOrThrow(String(session.lesson_id));
    const transcriptLines = await this.getTranscriptLines(lesson._id);
    const now = new Date();

    session.last_position_seconds = lesson.duration_seconds;
    session.current_transcript_line_id = null;
    session.completed = true;
    session.completed_at = session.completed_at ?? now;
    session.ended_at = session.ended_at ?? now;

    await session.save();
    await this.persistListeningProgress({
      userId: session.user_id,
      learningUnitId: lesson.learning_unit_id,
      lessonId: lesson._id,
      currentPositionSeconds: lesson.duration_seconds,
      completed: true,
    });

    return this.buildSessionResponse(session, lesson, transcriptLines);
  }

  private async findLessonOrThrow(id: string) {
    const lesson = await ListeningLesson.findById(this.toObjectId(id));
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài nghe.');
    }

    return lesson;
  }

  private async findSessionOrThrow(id: string, userIdString?: string) {
    const session = await ListeningSession.findById(this.toObjectId(id));
    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên nghe.');
    }

    if (userIdString && String(session.user_id) !== userIdString) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phiên nghe này.',
      );
    }

    return session;
  }

  private async findUserOrThrow(userId: unknown) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return user;
  }

  private getTranscriptLines(lessonId: unknown) {
    return TranscriptLine.find({ lesson_id: lessonId }).sort({ start_time: 1 });
  }

  private resolveSessionSettings(
    input: Partial<
      | AudioProcessingQueryDto
      | StartListeningSessionDto
      | UpdateListeningSessionDto
    >,
    fallback?: Partial<SessionSettings>,
  ): SessionSettings {
    return {
      playbackSpeed: this.resolvePlaybackSpeed(
        input.playbackSpeed,
        fallback?.playbackSpeed ?? DEFAULT_PLAYBACK_SPEED,
      ),
      playbackMode: this.resolvePlaybackMode(
        input.playbackMode,
        fallback?.playbackMode ?? DEFAULT_PLAYBACK_MODE,
      ),
      ambientSound: this.resolveAmbientSound(
        input.ambientSound,
        fallback?.ambientSound ?? DEFAULT_AMBIENT_SOUND,
      ),
      ambientVolume: this.resolveAmbientVolume(
        input.ambientVolume,
        fallback?.ambientVolume ?? DEFAULT_AMBIENT_VOLUME,
      ),
    };
  }

  private resolvePlaybackSpeed(
    value: unknown,
    fallback: PlaybackSpeed,
  ): PlaybackSpeed {
    const normalized = normalizePlaybackSpeed(value);
    if (normalized === undefined) {
      return fallback;
    }
    if (!PLAYBACK_SPEEDS.includes(normalized)) {
      throw new BadRequestException('Tốc độ phát không hợp lệ.');
    }

    return normalized;
  }

  private resolvePlaybackMode(
    value: unknown,
    fallback: PlaybackMode,
  ): PlaybackMode {
    const normalized = normalizePlaybackMode(value);
    if (normalized === undefined) {
      return fallback;
    }
    if (!PLAYBACK_MODES.includes(normalized)) {
      throw new BadRequestException('Chế độ phát không hợp lệ.');
    }

    return normalized;
  }

  private resolveAmbientSound(
    value: unknown,
    fallback: AmbientSound | null,
  ): AmbientSound | null {
    const normalized = normalizeAmbientSound(value);
    if (normalized === undefined) {
      return fallback;
    }
    if (normalized !== null && !AMBIENT_SOUNDS.includes(normalized)) {
      throw new BadRequestException('Âm thanh môi trường không hợp lệ.');
    }

    return normalized;
  }

  private resolveAmbientVolume(value: unknown, fallback: number) {
    const normalized = normalizeAmbientVolume(value);
    if (normalized === undefined) {
      return fallback;
    }
    if (!Number.isFinite(normalized)) {
      throw new BadRequestException('Âm lượng môi trường không hợp lệ.');
    }

    return Math.min(Math.max(normalized, 0), 100);
  }

  private resolvePlaybackPosition({
    durationSeconds,
    fallbackPositionSeconds,
    requestedPositionSeconds,
    transcriptLineId,
    transcriptLines,
  }: {
    durationSeconds: number;
    fallbackPositionSeconds: number;
    requestedPositionSeconds?: number;
    transcriptLineId?: string;
    transcriptLines: any[];
  }) {
    if (transcriptLineId !== undefined) {
      if (!Types.ObjectId.isValid(transcriptLineId)) {
        throw new BadRequestException('Transcript line id không hợp lệ.');
      }

      const selectedLine = transcriptLines.find(
        (line) => String(line._id) === transcriptLineId,
      );
      if (!selectedLine) {
        throw new NotFoundException(
          'Không tìm thấy transcript line trong bài nghe này.',
        );
      }

      return this.clampPosition(selectedLine.start_time, durationSeconds);
    }

    return this.clampPosition(
      requestedPositionSeconds ?? fallbackPositionSeconds,
      durationSeconds,
    );
  }

  private buildSessionResponse(
    session: any,
    lesson: any,
    transcriptLines: any[],
  ) {
    const settings: SessionSettings = {
      playbackSpeed: session.playback_speed,
      playbackMode: session.playback_mode,
      ambientSound: session.ambient_sound,
      ambientVolume: session.ambient_volume,
    };

    return {
      session: {
        id: String(session._id),
        userId: String(session.user_id),
        lessonId: String(session.lesson_id),
        learningUnitId: String(session.learning_unit_id),
        playbackSpeed: settings.playbackSpeed,
        playbackMode: settings.playbackMode,
        ambientSound: settings.ambientSound ?? 'off',
        ambientVolume: settings.ambientVolume,
        lastPositionSeconds: session.last_position_seconds,
        currentTranscriptLineId: session.current_transcript_line_id
          ? String(session.current_transcript_line_id)
          : null,
        completed: session.completed,
        completedAt: session.completed_at,
        endedAt: session.ended_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      lesson: this.buildLessonResponse(lesson, transcriptLines),
      audioProcessing: this.buildAudioProcessingPlan(
        lesson,
        transcriptLines,
        session.last_position_seconds,
        settings,
      ),
    };
  }

  private buildLessonResponse(lesson: any, transcriptLines: any[]) {
    return {
      id: String(lesson._id),
      learningUnitId: String(lesson.learning_unit_id),
      titleVi: lesson.title_vi,
      titleJa: lesson.title_ja,
      audioUrl: lesson.audio_url,
      durationSeconds: lesson.duration_seconds,
      description: lesson.description,
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
      transcriptLines: transcriptLines.map((line, index) =>
        this.mapTranscriptLine(line, index),
      ),
    };
  }

  private buildAudioProcessingPlan(
    lesson: any,
    transcriptLines: any[],
    currentPositionSeconds: number,
    settings: SessionSettings,
  ) {
    const currentLine = this.findCurrentTranscriptLine(
      transcriptLines,
      currentPositionSeconds,
    );
    const currentLineIndex = currentLine
      ? transcriptLines.findIndex(
          (line) => String(line._id) === String(currentLine._id),
        )
      : -1;
    const ambientEnabled =
      settings.ambientSound !== null && settings.ambientVolume > 0;

    return {
      lessonId: String(lesson._id),
      learningUnitId: String(lesson.learning_unit_id),
      titleVi: lesson.title_vi,
      titleJa: lesson.title_ja,
      audioUrl: lesson.audio_url,
      durationSeconds: lesson.duration_seconds,
      currentPositionSeconds,
      playbackSpeed: settings.playbackSpeed,
      playbackRate: settings.playbackSpeed,
      playbackMode: settings.playbackMode,
      shouldAutoStop: settings.playbackMode === 'study',
      nextStopAtSeconds:
        settings.playbackMode === 'study' && currentLine
          ? currentLine.end_time
          : null,
      ambientSound: settings.ambientSound ?? 'off',
      ambientVolume: settings.ambientVolume,
      shouldMixAmbientSound: ambientEnabled,
      ambientMix: {
        enabled: ambientEnabled,
        sound: settings.ambientSound,
        volume: settings.ambientVolume / 100,
      },
      currentTranscriptLineIndex: currentLineIndex,
      currentTranscriptLine: currentLine
        ? this.mapTranscriptLine(currentLine, currentLineIndex)
        : null,
      segments: transcriptLines.map((line, index) =>
        this.mapTranscriptLine(line, index),
      ),
    };
  }

  private mapTranscriptLine(line: any, index: number) {
    return {
      id: String(line._id),
      index,
      startTime: line.start_time,
      endTime: line.end_time,
      textVi: line.text_vi,
      textJa: line.text_ja,
    };
  }

  private findCurrentTranscriptLine(
    transcriptLines: any[],
    currentPositionSeconds: number,
  ) {
    return (
      transcriptLines.find(
        (line) =>
          line.start_time <= currentPositionSeconds &&
          currentPositionSeconds < line.end_time,
      ) ?? null
    );
  }

  private clampPosition(position: number, durationSeconds: number) {
    if (!Number.isFinite(position)) {
      return 0;
    }

    return Math.min(Math.max(position, 0), durationSeconds);
  }

  private isLessonCompleted(position: number, durationSeconds: number) {
    return (
      position >= Math.max(durationSeconds - COMPLETION_THRESHOLD_SECONDS, 0)
    );
  }

  private async persistListeningProgress({
    userId,
    learningUnitId,
    lessonId,
    currentPositionSeconds,
    completed,
  }: {
    userId: unknown;
    learningUnitId: unknown;
    lessonId: unknown;
    currentPositionSeconds: number;
    completed: boolean;
  }) {
    const $set: Record<string, unknown> = {
      'listening_progress.lesson_id': lessonId,
      'listening_progress.last_position_seconds': currentPositionSeconds,
    };

    if (completed) {
      $set['listening_progress.completed'] = true;
      $set['listening_progress.completed_at'] = new Date();
    }

    const update: Record<string, unknown> = { $set };
    if (!completed) {
      update.$setOnInsert = {
        'listening_progress.completed': false,
        'listening_progress.completed_at': null,
      };
    }

    await UserProgress.updateOne(
      { user_id: userId, learning_unit_id: learningUnitId },
      update,
      { upsert: true },
    );
  }

  private async deleteLearningUnitDependencies(learningUnitIds: any[]) {
    if (!learningUnitIds.length) {
      return;
    }

    const lessons = await ListeningLesson.find({
      learning_unit_id: { $in: learningUnitIds },
    });
    const lessonIds = lessons.map((lesson) => lesson._id);

    await TranscriptLine.deleteMany({ lesson_id: { $in: lessonIds } });
    await ListeningSession.deleteMany({ lesson_id: { $in: lessonIds } });
    await UserProgress.deleteMany({
      learning_unit_id: { $in: learningUnitIds },
    });
    await VocabularyCard.deleteMany({
      learning_unit_id: { $in: learningUnitIds },
    });
    await ListeningLesson.deleteMany({
      learning_unit_id: { $in: learningUnitIds },
    });
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new NotFoundException('Id không hợp lệ.');
    }

    return new Types.ObjectId(value);
  }

  private mapPlace(place: any) {
    return {
      id: String(place._id),
      nameVi: place.name_vi,
      nameJa: place.name_ja,
      description: place.description ?? null,
      avatarUrl: place.avatar_url ?? null,
    };
  }

  private mapSituation(situation: any) {
    return {
      id: String(situation._id),
      placeId: String(situation.place_id),
      titleVi: situation.title_vi,
      titleJa: situation.title_ja,
      description: situation.description ?? null,
    };
  }

  private mapLearningUnit(unit: any, level: any) {
    return {
      id: String(unit._id),
      situationId: String(unit.situation_id),
      levelId: String(unit.level_id),
      titleVi: unit.title_vi,
      titleJa: unit.title_ja,
      description: unit.description ?? null,
      level: level
        ? {
            id: String(level._id),
            code: level.code,
            nameVi: level.name_vi ?? null,
            nameJa: level.name_ja,
          }
        : null,
    };
  }
}

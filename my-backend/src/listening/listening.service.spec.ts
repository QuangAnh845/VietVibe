import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListeningService } from './listening.service';
import * as path from 'path';

// Import Mongoose models directly for seeding/assertion in tests
const models = require(path.resolve(__dirname, '../../src/models'));
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

describe('ListeningService (LearningUnit CRUD & Performance & Integrity)', () => {
  let service: ListeningService;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListeningService],
    }).compile();

    service = module.get<ListeningService>(ListeningService);

    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('createLearningUnit', () => {
    it('should successfully create a learning unit when all inputs are valid', async () => {
      // 1. Seed Place
      const place = await Place.create({
        name_vi: 'Siêu thị',
        name_ja: 'スーパー',
      });

      // 2. Seed Situation
      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });

      // 3. Seed Level
      const level = await Level.create({
        code: 'B1',
        name_vi: 'Trung cấp',
        name_ja: '中級',
      });

      const dto = {
        situationId: String(situation._id),
        levelId: String(level._id),
        titleVi: 'Bài học 1',
        titleJa: 'レッスン1',
        description: 'Mô tả bài học 1',
      };

      const result = await service.createLearningUnit(dto);

      expect(result).toBeDefined();
      expect(result.titleVi).toBe(dto.titleVi);
      expect(result.situationId).toBe(dto.situationId);
      expect(result.levelId).toBe(dto.levelId);
      expect(result.level).toBeDefined();
      expect(result.level?.code).toBe('B1');

      // Verify db state
      const dbUnit = await LearningUnit.findById(result.id);
      expect(dbUnit).toBeDefined();
      expect(dbUnit.title_vi).toBe(dto.titleVi);
    });

    it('should throw NotFoundException if situation does not exist', async () => {
      const level = await Level.create({
        code: 'B1',
        name_vi: 'Trung cấp',
        name_ja: '中級',
      });

      const fakeSituationId = new mongoose.Types.ObjectId().toString();

      const dto = {
        situationId: fakeSituationId,
        levelId: String(level._id),
        titleVi: 'Bài học 1',
        titleJa: 'レッスン1',
      };

      await expect(service.createLearningUnit(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if level does not exist', async () => {
      const place = await Place.create({
        name_vi: 'Siêu thị',
        name_ja: 'スーパー',
      });

      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });

      const fakeLevelId = new mongoose.Types.ObjectId().toString();

      const dto = {
        situationId: String(situation._id),
        levelId: fakeLevelId,
        titleVi: 'Bài học 1',
        titleJa: 'レッスン1',
      };

      await expect(service.createLearningUnit(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if learning unit with situationId + levelId already exists', async () => {
      const place = await Place.create({
        name_vi: 'Siêu thị',
        name_ja: 'スーパー',
      });

      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });

      const level = await Level.create({
        code: 'B1',
        name_vi: 'Trung cấp',
        name_ja: 'Nhật trung cấp',
      });

      const dto = {
        situationId: String(situation._id),
        levelId: String(level._id),
        titleVi: 'Bài học 1',
        titleJa: 'レッスン1',
      };

      // Create once
      await service.createLearningUnit(dto);

      // Create again -> should fail
      await expect(service.createLearningUnit(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateLearningUnit', () => {
    it('should successfully update a learning unit', async () => {
      const place = await Place.create({ name_vi: 'Siêu thị', name_ja: 'スーパー' });
      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });
      const level = await Level.create({ code: 'B1', name_vi: 'Trung cấp', name_ja: '中級' });

      const unit = await LearningUnit.create({
        situation_id: situation._id,
        level_id: level._id,
        title_vi: 'Bài gốc',
        title_ja: '元レッスン',
      });

      const updateDto = {
        titleVi: 'Bài mới',
        description: 'Mô tả mới',
      };

      const result = await service.updateLearningUnit(String(unit._id), updateDto);
      expect(result.titleVi).toBe('Bài mới');
      expect(result.description).toBe('Mô tả mới');
    });

    it('should throw BadRequestException if update causes duplicate situation + level', async () => {
      const place = await Place.create({ name_vi: 'Siêu thị', name_ja: 'スーパー' });
      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });
      const level1 = await Level.create({ code: 'B1', name_vi: 'B1', name_ja: 'B1' });
      const level2 = await Level.create({ code: 'B2', name_vi: 'B2', name_ja: 'B2' });

      // Unit 1: Situation + Level 1
      await LearningUnit.create({
        situation_id: situation._id,
        level_id: level1._id,
        title_vi: 'Unit 1',
        title_ja: 'Unit 1',
      });

      // Unit 2: Situation + Level 2
      const unit2 = await LearningUnit.create({
        situation_id: situation._id,
        level_id: level2._id,
        title_vi: 'Unit 2',
        title_ja: 'Unit 2',
      });

      // Update Unit 2 to have Level 1 -> should cause duplicate error
      const updateDto = {
        levelId: String(level1._id),
      };

      await expect(
        service.updateLearningUnit(String(unit2._id), updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Optimized Queries (N+1 query checks)', () => {
    it('should efficiently fetch all learning units with populated level', async () => {
      const place = await Place.create({ name_vi: 'Siêu thị', name_ja: 'スーパー' });
      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });
      const level = await Level.create({ code: 'B1', name_vi: 'B1', name_ja: 'B1' });

      await LearningUnit.create({
        situation_id: situation._id,
        level_id: level._id,
        title_vi: 'Unit 1',
        title_ja: 'Unit 1',
      });

      const spyPopulate = jest.spyOn(mongoose.Query.prototype, 'populate');

      const result = await service.getAllLearningUnits();
      expect(result).toHaveLength(1);
      expect(result[0].level).toBeDefined();
      expect(result[0].level?.code).toBe('B1');

      // Verify that Mongoose's populate was called to optimize the query load
      expect(spyPopulate).toHaveBeenCalledWith('level_id');
      spyPopulate.mockRestore();
    });

    it('should efficiently fetch full place structures without nested N+1 loops', async () => {
      const place = await Place.create({ name_vi: 'Siêu thị', name_ja: 'スーパー' });
      const situation1 = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });
      const situation2 = await Situation.create({
        place_id: place._id,
        title_vi: 'Mua rau',
        title_ja: '野菜買い',
      });
      const level = await Level.create({ code: 'B1', name_vi: 'B1', name_ja: 'B1' });

      await LearningUnit.create({
        situation_id: situation1._id,
        level_id: level._id,
        title_vi: 'Unit 1',
        title_ja: 'Unit 1',
      });

      await LearningUnit.create({
        situation_id: situation2._id,
        level_id: level._id,
        title_vi: 'Unit 2',
        title_ja: 'Unit 2',
      });

      const spyFind = jest.spyOn(LearningUnit, 'find');

      const result = await service.getPlaceFull(String(place._id));

      expect(result.id).toBe(String(place._id));
      expect(result.situations).toHaveLength(2);
      expect(result.situations[0].learningUnits).toHaveLength(1);
      expect(result.situations[1].learningUnits).toHaveLength(1);

      // Crucial assertion: LearningUnit.find should only be called ONCE (for the entire list of situations),
      // rather than N times (once for each situation). This confirms N+1 is solved!
      expect(spyFind).toHaveBeenCalledTimes(1);
      spyFind.mockRestore();
    });
  });

  describe('Cascade Delete Dependencies', () => {
    it('should completely delete all dependencies of a learning unit (including vocabulary cards)', async () => {
      // 1. Setup entities
      const place = await Place.create({ name_vi: 'Siêu thị', name_ja: 'スーパー' });
      const situation = await Situation.create({
        place_id: place._id,
        title_vi: 'Thanh toán',
        title_ja: '会計',
      });
      const level = await Level.create({ code: 'B1', name_vi: 'B1', name_ja: 'B1' });
      const user = await User.create({
        email: 'learner@gmail.com',
        password_hash: '123456',
        user_name: 'learner',
        full_name: 'Learner',
      });

      const unit = await LearningUnit.create({
        situation_id: situation._id,
        level_id: level._id,
        title_vi: 'Unit 1',
        title_ja: 'Unit 1',
      });

      // 2. Add dependent entities
      const lesson = await ListeningLesson.create({
        learning_unit_id: unit._id,
        title_vi: 'Bài nghe 1',
        title_ja: '聴解1',
        audio_url: '/audios/1.mp3',
        duration_seconds: 120,
      });

      await TranscriptLine.create({
        lesson_id: lesson._id,
        start_time: 0,
        end_time: 5,
        text_vi: 'Xin chào',
        text_ja: 'こんにちは',
      });

      await ListeningSession.create({
        user_id: user._id,
        lesson_id: lesson._id,
        learning_unit_id: unit._id,
        playback_speed: 1.0,
        playback_mode: 'continuous',
      });

      await UserProgress.create({
        user_id: user._id,
        learning_unit_id: unit._id,
        vocabulary_progress: { viewed_card_ids: [], completed: false },
        listening_progress: { lesson_id: lesson._id, completed: false },
      });

      await VocabularyCard.create({
        learning_unit_id: unit._id,
        word_vi: 'Táo',
        meaning_ja: 'りんご',
      });

      // Assert pre-conditions (ensure they exist in database)
      expect(await LearningUnit.countDocuments()).toBe(1);
      expect(await ListeningLesson.countDocuments()).toBe(1);
      expect(await TranscriptLine.countDocuments()).toBe(1);
      expect(await ListeningSession.countDocuments()).toBe(1);
      expect(await UserProgress.countDocuments()).toBe(1);
      expect(await VocabularyCard.countDocuments()).toBe(1);

      // 3. Delete the LearningUnit
      const deleteResult = await service.deleteLearningUnit(String(unit._id));
      expect(deleteResult).toEqual({ deleted: true });

      // Assert post-conditions (ensure everything is cascade deleted)
      expect(await LearningUnit.countDocuments()).toBe(0);
      expect(await ListeningLesson.countDocuments()).toBe(0);
      expect(await TranscriptLine.countDocuments()).toBe(0);
      expect(await ListeningSession.countDocuments()).toBe(0);
      expect(await UserProgress.countDocuments()).toBe(0);
      expect(await VocabularyCard.countDocuments()).toBe(0); // [IMPORTANT] VocabularyCard must be cascade deleted!
    });
  });
});

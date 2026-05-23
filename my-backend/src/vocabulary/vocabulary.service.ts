import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import { GetVocabularyListQueryDto } from './dto/get-vocabulary-list.query';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { availableMemory } from 'process';

const models = require(path.resolve(__dirname, '../../src/models'));
const mongoose = require('mongoose');
const { Types } = mongoose;

const {
  VocabularyCard,
  LearningUnit,
  Situation,
  Level,
} = models;

@Injectable()
export class VocabularyService {
  async getVocabularyList(query: GetVocabularyListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const learningUnitFilter: Record<string, unknown> = {};

    if (query.learningUnitId) {
      learningUnitFilter._id = this.toObjectId(query.learningUnitId);
    }

    if (query.situationId) {
      learningUnitFilter.situation_id = this.toObjectId(query.situationId);
    }

    if (query.levelId) {
      learningUnitFilter.level_id = this.toObjectId(query.levelId);
    }

    if (query.placeId) {
      const placeObjectId = this.toObjectId(query.placeId);
      const situations = await Situation.find({ place_id: placeObjectId }).select('_id');
      const situationIds = situations.map((situation) => situation._id);

      if (situationIds.length === 0) {
        return this.buildEmptyPagination(page, limit);
      }

      if (query.situationId && !situationIds.some((id) => String(id) === String(query.situationId))) {
        return this.buildEmptyPagination(page, limit);
      }

      learningUnitFilter.situation_id = { $in: situationIds };
    }

    let learningUnitIds: string[] = [];
    let hasLearningUnitFilter = false;

    if (Object.keys(learningUnitFilter).length > 0) {
      const learningUnits = await LearningUnit.find(learningUnitFilter).select('_id');
      learningUnitIds = learningUnits.map((unit) => String(unit._id));
      hasLearningUnitFilter = true;

      if (learningUnitIds.length === 0) {
        return this.buildEmptyPagination(page, limit);
      }
    }

    const vocabularyFilter: Record<string, unknown> = {};

    if (hasLearningUnitFilter) {
      vocabularyFilter.learning_unit_id = { $in: learningUnitIds };
    }

    if (query.tag) {
      vocabularyFilter.tag = { $regex: this.escapeRegExp(query.tag), $options: 'i' };
    }

    if (query.search) {
      const searchRegex = new RegExp(this.escapeRegExp(query.search), 'i');
      vocabularyFilter.$or = [
        { word_vi: searchRegex },
        { meaning_ja: searchRegex },
        { example_vi: searchRegex },
        { example_ja: searchRegex },
        { note: searchRegex },
        { tag: searchRegex },
      ];
    }

    const total = await VocabularyCard.countDocuments(vocabularyFilter);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
    const sortField = query.sortBy ?? 'created_at';

    const vocabularyCards = await VocabularyCard.find(vocabularyFilter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'learning_unit_id',
        select: 'title_vi title_ja situation_id level_id',
        populate: [
          {
            path: 'situation_id',
            select: 'title_vi title_ja place_id',
            populate: {
              path: 'place_id',
              select: 'name_vi name_ja',
            },
          },
          {
            path: 'level_id',
            select: 'code name_vi name_ja description',
          },
        ],
      });

    return {
      data: vocabularyCards.map((card) => this.mapVocabularyCard(card)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getVocabularyByLearningUnit(learningUnitId: string) {
    const learningUnit = await LearningUnit.findById(learningUnitId)
      .populate({
        path: 'situation_id',
        select: 'title_vi title_ja place_id',
        populate: {
          path: 'place_id',
          select: 'name_vi name_ja',
        },
      })
      .populate({
        path: 'level_id',
        select: 'code name_vi name_ja description',
      });

    if (!learningUnit) {
      throw new NotFoundException('Không tìm thấy bài học tương ứng với learningUnitId này.');
    }

    const vocabularyCards = await VocabularyCard.find({ learning_unit_id: learningUnitId }).sort({ created_at: 1 });

    return {
      learningUnit: this.mapLearningUnit(learningUnit),
      data: vocabularyCards.map((card) => this.mapVocabularyCard(card)),
      meta: {
        total: vocabularyCards.length,
      },
    };
  }

  /**
   * [ADMIN] Create new vocabulary card
   */
  async createVocabulary(createDto: CreateVocabularyDto) {
    // Validate learning unit exists
    const learningUnit = await LearningUnit.findById(createDto.learning_unit_id);
    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    const newCard = await VocabularyCard.create({
      learning_unit_id: createDto.learning_unit_id,
      word_vi: createDto.word_vi.trim(),
      meaning_ja: createDto.meaning_ja.trim(),
      example_vi: createDto.example_vi?.trim() || null,
      example_ja: createDto.example_ja?.trim() || null,
      note: createDto.note?.trim() || null,
      tag: createDto.tag?.trim() || null,
    });

    return {
      success: true,
      message: '新しい単語カードが正常に作成されました',
      data: this.mapVocabularyCard(newCard),
    };
  }

  /**
   * [ADMIN] Get vocabulary card by ID
   */
  async getVocabularyById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('無効な ID です');
    }

    const card = await VocabularyCard.findById(id)
      .populate({
        path: 'learning_unit_id',
        select: 'title_vi title_ja situation_id level_id',
        populate: [
          {
            path: 'situation_id',
            select: 'title_vi title_ja place_id',
            populate: {
              path: 'place_id',
              select: 'name_vi name_ja',
            },
          },
          {
            path: 'level_id',
            select: 'code name_vi name_ja description',
          },
        ],
      });

    if (!card) {
      throw new NotFoundException('単語カードが見つかりません');
    }

    return {
      success: true,
      data: this.mapVocabularyCard(card),
    };
  }

  /**
   * [ADMIN] Update vocabulary card
   */
  async updateVocabulary(id: string, updateDto: UpdateVocabularyDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('無効な ID です');
    }

    // If learning_unit_id is being changed, validate it exists
    if (updateDto.learning_unit_id) {
      const learningUnit = await LearningUnit.findById(updateDto.learning_unit_id);
      if (!learningUnit) {
        throw new NotFoundException('Learning unit not found');
      }
    }

    const updatedCard = await VocabularyCard.findByIdAndUpdate(
      id,
      {
        ...(updateDto.learning_unit_id && { learning_unit_id: updateDto.learning_unit_id }),
        ...(updateDto.word_vi && { word_vi: updateDto.word_vi.trim() }),
        ...(updateDto.meaning_ja && { meaning_ja: updateDto.meaning_ja.trim() }),
        ...(updateDto.example_vi !== undefined && { example_vi: updateDto.example_vi?.trim() || null }),
        ...(updateDto.example_ja !== undefined && { example_ja: updateDto.example_ja?.trim() || null }),
        ...(updateDto.note !== undefined && { note: updateDto.note?.trim() || null }),
        ...(updateDto.tag !== undefined && { tag: updateDto.tag?.trim() || null }),
      },
      { returnDocument: 'after' }
    ).populate({
      path: 'learning_unit_id',
      select: 'title_vi title_ja situation_id level_id',
      populate: [
        {
          path: 'situation_id',
          select: 'title_vi title_ja place_id',
          populate: {
            path: 'place_id',
            select: 'name_vi name_ja',
          },
        },
        {
          path: 'level_id',
          select: 'code name_vi name_ja description',
        },
      ],
    });

    if (!updatedCard) {
      throw new NotFoundException('単語カードが見つかりません');
    }

    return {
      success: true,
      message: '単語カードが正常に更新されました',
      data: this.mapVocabularyCard(updatedCard),
    };
  }

  /**
   * [ADMIN] Delete vocabulary card
   */
  async deleteVocabulary(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('無効な ID です');
    }

    const card = await VocabularyCard.findByIdAndDelete(id);

    if (!card) {
      throw new NotFoundException('単語カードが見つかりません');
    }

    return {
      success: true,
      message: '単語カードが正常に削除されました',
      deletedId: id,
    };
  }

  /**
   * [ADMIN] Get all vocabulary cards with full details (no pagination)
   */
  async getAllVocabulary() {
    const cards = await VocabularyCard.find()
      .populate({
        path: 'learning_unit_id',
        select: 'title_vi title_ja situation_id level_id',
        populate: [
          {
            path: 'situation_id',
            select: 'title_vi title_ja place_id',
            populate: {
              path: 'place_id',
              select: 'name_vi name_ja',
            },
          },
          {
            path: 'level_id',
            select: 'code name_vi name_ja description',
          },
        ],
      })
      .sort({ created_at: -1 });

    return {
      success: true,
      data: cards.map((card) => this.mapVocabularyCard(card)),
      meta: {
        total: cards.length,
      },
    };
  }

  private buildEmptyPagination(page: number, limit: number) {
    return {
      data: [],
      meta: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: page > 1,
      },
    };
  }

  private mapVocabularyCard(card: any) {
    return {
      id: String(card._id),
      learningUnitId: String(card.learning_unit_id?._id ?? card.learning_unit_id),
      wordVi: card.word_vi,
      meaningJa: card.meaning_ja,
      exampleVi: card.example_vi,
      exampleJa: card.example_ja,
      note: card.note,
      tag: card.tag,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
      learningUnit: this.mapLearningUnit(card.learning_unit_id),
    };
  }

  private mapLearningUnit(learningUnit: any) {
    if (!learningUnit) {
      return null;
    }

    return {
      id: String(learningUnit._id),
      titleVi: learningUnit.title_vi,
      titleJa: learningUnit.title_ja,
      description: learningUnit.description,
      situation: this.mapSituation(learningUnit.situation_id),
      level: this.mapLevel(learningUnit.level_id),
    };
  }

  private mapSituation(situation: any) {
    if (!situation) {
      return null;
    }

    return {
      id: String(situation._id),
      titleVi: situation.title_vi,
      titleJa: situation.title_ja,
      place: this.mapPlace(situation.place_id),
    };
  }

  private mapLevel(level: any) {
    if (!level) {
      return null;
    }

    return {
      id: String(level._id),
      code: level.code,
      nameVi: level.name_vi,
      nameJa: level.name_ja,
      description: level.description,
    };
  }

  private mapPlace(place: any) {
    if (!place) {
      return null;
    }

    return {
      id: String(place._id),
      nameVi: place.name_vi,
      nameJa: place.name_ja,
      avatarUrl: place.avatar_url,
    };
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new NotFoundException('Id không hợp lệ.');
    }

    return new Types.ObjectId(value);
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

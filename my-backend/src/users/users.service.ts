import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../login/schemas/user.schema.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';

const models = require(path.resolve(__dirname, '../../src/models'));
const { LearningUnit, VocabularyCard, ListeningLesson, UserProgress } = models;

type UserProgressRecord = {
  learning_unit_id: unknown;
  vocabulary_progress?: {
    viewed_card_ids?: unknown[];
    completed?: boolean;
    completed_at?: Date | null;
  };
  listening_progress?: {
    lesson_id?: unknown;
    last_position_seconds?: number;
    completed?: boolean;
    completed_at?: Date | null;
  };
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password_hash').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    if (updateData.email) {
      const existingUser = await this.userModel.findOne({ email: updateData.email, _id: { $ne: userId } }).exec();
      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    ).select('-password_hash').exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async updatePassword(userId: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(updatePasswordDto.currentPassword, user.password_hash);
    if (!passwordMatches) {
      throw new BadRequestException('Incorrect current password');
    }

    const newPasswordHash = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: { avatar_url: avatarUrl } },
      { returnDocument: 'after' }
    ).select('-password_hash').exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async getListeningSettings(userId: string) {
    const user = await this.userModel.findById(userId).select('listening_settings badges').exec();
    if (!user) throw new NotFoundException('User not found');
    return user.listening_settings || {};
  }

  async getCurrentUserProgress(userId: string) {
    const [learningUnits, progressRecords] = await Promise.all([
      LearningUnit.find().select('_id').exec(),
      UserProgress.find({ user_id: userId }).exec(),
    ]);

    const progressByUnitId = new Map(
      (progressRecords as UserProgressRecord[]).map((record) => [
        String(record.learning_unit_id),
        record,
      ]),
    );

    let totalUnits = 0;
    let completedUnits = 0;
    let accumulatedProgress = 0;

    for (const unit of learningUnits) {
      totalUnits += 1;

      const [vocabularyCardsCount, listeningLesson] = await Promise.all([
        VocabularyCard.countDocuments({ learning_unit_id: unit._id }),
        ListeningLesson.findOne({ learning_unit_id: unit._id }).select('_id duration_seconds').exec(),
      ]);

      const progress = progressByUnitId.get(String(unit._id));
      const viewedCardIds = progress?.vocabulary_progress?.viewed_card_ids ?? [];
      const lastPositionSeconds = progress?.listening_progress?.last_position_seconds ?? 0;

      const vocabularyPercent = vocabularyCardsCount > 0
        ? Math.min(viewedCardIds.length / vocabularyCardsCount, 1)
        : 0;

      const listeningPercent = listeningLesson?.duration_seconds
        ? Math.min(lastPositionSeconds / listeningLesson.duration_seconds, 1)
        : 0;

      const parts: number[] = [];
      if (vocabularyCardsCount > 0) parts.push(vocabularyPercent);
      if (listeningLesson) parts.push(listeningPercent);

      const unitProgress = parts.length > 0
        ? parts.reduce((sum, value) => sum + value, 0) / parts.length
        : 0;

      accumulatedProgress += unitProgress;

      if (
        vocabularyCardsCount > 0 &&
        vocabularyPercent >= 1 &&
        listeningLesson &&
        listeningPercent >= 1
      ) {
        completedUnits += 1;
      }
    }

    const progressPercent = totalUnits > 0
      ? Math.round((accumulatedProgress / totalUnits) * 100)
      : 0;

    return {
      userId,
      totalLearningUnits: totalUnits,
      completedLearningUnits: completedUnits,
      progressPercent,
    };
  }

  async markVocabularyCardViewed(
    userId: string,
    learningUnitId: string,
    vocabularyCardId: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('User id không hợp lệ');
    }

    if (!Types.ObjectId.isValid(learningUnitId)) {
      throw new BadRequestException('Learning unit id không hợp lệ');
    }

    if (!Types.ObjectId.isValid(vocabularyCardId)) {
      throw new BadRequestException('Vocabulary card id không hợp lệ');
    }

    const userObjectId = new Types.ObjectId(userId);
    const learningUnitObjectId = new Types.ObjectId(learningUnitId);
    const vocabularyCardObjectId = new Types.ObjectId(vocabularyCardId);

    const [learningUnit, vocabularyCard, totalVocabularyCards] = await Promise.all([
      LearningUnit.findById(learningUnitObjectId).select('_id').exec(),
      VocabularyCard.findOne({
        _id: vocabularyCardObjectId,
        learning_unit_id: learningUnitObjectId,
      })
        .select('_id learning_unit_id')
        .exec(),
      VocabularyCard.countDocuments({ learning_unit_id: learningUnitObjectId }),
    ]);

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    if (!vocabularyCard) {
      throw new NotFoundException('Vocabulary card not found in this learning unit');
    }

    const existingProgress = await UserProgress.findOne({
      user_id: userObjectId,
      learning_unit_id: learningUnitObjectId,
    });

    const viewedCardIds = new Set(
      (existingProgress?.vocabulary_progress?.viewed_card_ids ?? []).map((value) =>
        String(value),
      ),
    );
    viewedCardIds.add(String(vocabularyCardObjectId));

    const isCompleted =
      totalVocabularyCards > 0 && viewedCardIds.size >= totalVocabularyCards;

    const update: Record<string, unknown> = {
      $set: {
        'vocabulary_progress.viewed_card_ids': Array.from(viewedCardIds).map(
          (value) => new Types.ObjectId(String(value)),
        ),
        'vocabulary_progress.completed': isCompleted,
        'vocabulary_progress.completed_at': isCompleted
          ? existingProgress?.vocabulary_progress?.completed_at ?? new Date()
          : null,
      },
    };

    await UserProgress.updateOne(
      {
        user_id: userObjectId,
        learning_unit_id: learningUnitObjectId,
      },
      update,
      { upsert: true },
    );

    return {
      success: true,
      userId,
      learningUnitId,
      vocabularyCardId,
      viewedCardsCount: viewedCardIds.size,
      totalVocabularyCards,
      completed: isCompleted,
    };
  }

  async updateListeningSettings(userId: string, updateDto: import('./dto/update-listening-settings.dto.js').UpdateListeningSettingsDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    if (!user.listening_settings) {
      user.listening_settings = { playback_speed: 1.0, auto_pause: false, environment_sound_id: null, environment_volume: 50 };
    }

    if (updateDto.playback_speed !== undefined) user.listening_settings.playback_speed = updateDto.playback_speed;
    if (updateDto.auto_pause !== undefined) user.listening_settings.auto_pause = updateDto.auto_pause;
    if (updateDto.environment_sound_id !== undefined) user.listening_settings.environment_sound_id = updateDto.environment_sound_id;
    if (updateDto.environment_volume !== undefined) user.listening_settings.environment_volume = updateDto.environment_volume;

    await user.save();
    return user.listening_settings;
  }
}


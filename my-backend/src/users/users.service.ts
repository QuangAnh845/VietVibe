import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as path from 'path';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../login/schemas/user.schema.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';
import { UpdateLearningUnitProgressDto } from './dto/update-learning-unit-progress.dto.js';

const models = require(path.resolve(__dirname, '../../src/models'));
const { LearningUnit, UserProgress, VocabularyCard } = models;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password_hash')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    if (updateData.email) {
      const existingUser = await this.userModel
        .findOne({ email: updateData.email, _id: { $ne: userId } })
        .exec();
      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateData },
        { returnDocument: 'after', runValidators: true },
      )
      .select('-password_hash')
      .exec();

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

    const passwordMatches = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password_hash,
    );
    if (!passwordMatches) {
      throw new BadRequestException('Incorrect current password');
    }

    const newPasswordHash = await bcrypt.hash(
      updatePasswordDto.newPassword,
      10,
    );
    user.password_hash = newPasswordHash;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { avatar_url: avatarUrl } },
        { returnDocument: 'after' },
      )
      .select('-password_hash')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async getListeningSettings(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('listening_settings badges')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user.listening_settings || {};
  }

  async updateListeningSettings(
    userId: string,
    updateDto: import('./dto/update-listening-settings.dto.js').UpdateListeningSettingsDto,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    if (!user.listening_settings) {
      user.listening_settings = {
        playback_speed: 1.0,
        auto_pause: false,
        environment_sound_id: null,
        environment_volume: 50,
      };
    }

    if (updateDto.playback_speed !== undefined)
      user.listening_settings.playback_speed = updateDto.playback_speed;
    if (updateDto.auto_pause !== undefined)
      user.listening_settings.auto_pause = updateDto.auto_pause;
    if (updateDto.environment_sound_id !== undefined)
      user.listening_settings.environment_sound_id =
        updateDto.environment_sound_id;
    if (updateDto.environment_volume !== undefined)
      user.listening_settings.environment_volume = updateDto.environment_volume;

    await user.save();
    return user.listening_settings;
  }

  async getOverallProgress(userId: string) {
    await this.ensureUserExists(userId);

    const [totalLearningUnits, userProgress] = await Promise.all([
      LearningUnit.countDocuments(),
      UserProgress.find({ user_id: this.toObjectId(userId) }),
    ]);

    const summary = userProgress.reduce(
      (acc, progress) => {
        const unitId = String(progress.learning_unit_id);
        const vocabCompleted = Boolean(progress.vocabulary_progress?.completed);
        const listenCompleted = Boolean(progress.listening_progress?.completed);

        if (vocabCompleted) acc.total_checked_vocab += 1;
        if (listenCompleted) acc.total_checked_listening += 1;

        acc.learning_unit_progress[unitId] = {
          vocab: vocabCompleted,
          listen: listenCompleted,
        };

        return acc;
      },
      {
        total_checked_vocab: 0,
        total_checked_listening: 0,
        learning_unit_progress: {} as Record<
          string,
          { vocab: boolean; listen: boolean }
        >,
      },
    );

    return {
      total_vocab_tasks: totalLearningUnits,
      total_listening_tasks: totalLearningUnits,
      total_checked_vocab: summary.total_checked_vocab,
      total_checked_listening: summary.total_checked_listening,
      learning_unit_progress: summary.learning_unit_progress,
    };
  }

  async updateLearningUnitProgress(
    userId: string,
    learningUnitId: string,
    updateDto: UpdateLearningUnitProgressDto,
  ) {
    await this.ensureUserExists(userId);

    const unit = await LearningUnit.findById(this.toObjectId(learningUnitId));
    if (!unit) {
      throw new NotFoundException('Learning unit not found');
    }

    const now = updateDto.completed ? new Date() : null;
    const updatePayload: Record<string, unknown> = {};
    if (updateDto.field === 'vocab') {
      updatePayload['vocabulary_progress.completed'] = updateDto.completed;
      updatePayload['vocabulary_progress.completed_at'] = now;
    } else {
      updatePayload['listening_progress.completed'] = updateDto.completed;
      updatePayload['listening_progress.completed_at'] = now;
    }

    await UserProgress.updateOne(
      {
        user_id: this.toObjectId(userId),
        learning_unit_id: this.toObjectId(learningUnitId),
      },
      {
        $set: updatePayload,
        $setOnInsert: {
          user_id: this.toObjectId(userId),
          learning_unit_id: this.toObjectId(learningUnitId),
        },
      },
      { upsert: true },
    );

    return this.getOverallProgress(userId);
  }

  async markVocabularyCardViewed(
    userId: string,
    learningUnitId: string,
    cardId: string,
  ) {
    await this.ensureUserExists(userId);

    const learningUnitObjectId = this.toObjectId(learningUnitId);
    const cardObjectId = this.toObjectId(cardId);
    const [learningUnit, vocabularyCard, totalCards] = await Promise.all([
      LearningUnit.findById(learningUnitObjectId).select('_id').exec(),
      VocabularyCard.findOne({
        _id: cardObjectId,
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
      throw new NotFoundException(
        'Vocabulary card not found for this learning unit',
      );
    }

    const userObjectId = this.toObjectId(userId);

    // Atomically add cardId to viewed_card_ids (prevents duplicates)
    const updated = await UserProgress.findOneAndUpdate(
      {
        user_id: userObjectId,
        learning_unit_id: learningUnitObjectId,
      },
      {
        $setOnInsert: { user_id: userObjectId, learning_unit_id: learningUnitObjectId },
        $addToSet: { 'vocabulary_progress.viewed_card_ids': cardObjectId },
      },
      { new: true, upsert: true },
    ).exec();

    if (!updated) {
      throw new NotFoundException('User progress could not be updated');
    }

    const viewedCardIds = updated.vocabulary_progress?.viewed_card_ids || [];

    // If the user has now viewed all cards, set completed and completed_at atomically
    if (viewedCardIds.length === totalCards) {
      await UserProgress.updateOne(
        {
          user_id: userObjectId,
          learning_unit_id: learningUnitObjectId,
          'vocabulary_progress.completed': { $ne: true },
        },
        {
          $set: {
            'vocabulary_progress.completed': true,
            'vocabulary_progress.completed_at': new Date(),
          },
        },
      ).exec();
    }

    const finalProgress = await UserProgress.findOne({
      user_id: userObjectId,
      learning_unit_id: learningUnitObjectId,
    }).exec();

    const completed = Boolean(finalProgress?.vocabulary_progress?.completed);

    return {
      success: true,
      message: completed
        ? 'Vocabulary progress completed successfully'
        : 'Vocabulary progress updated successfully',
      data: {
        userId,
        learningUnitId,
        cardId,
        viewedCardIds: finalProgress?.vocabulary_progress?.viewed_card_ids || [],
        viewedCardCount: finalProgress?.vocabulary_progress?.viewed_card_ids?.length || 0,
        totalCards,
        completed,
        completedAt: finalProgress?.vocabulary_progress?.completed_at ?? null,
      },
    };
  }

  async findAll(search?: string, month?: string) {
    const filter: Record<string, any> = { role: { $ne: 'admin' } };

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ user_name: regex }, { email: regex }];
    }

    if (month === 'current') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.created_at = { $gte: startOfMonth };
    }

    const users = await this.userModel
      .find(filter)
      .select('-password_hash')
      .sort({ created_at: -1 })
      .exec();

    return users;
  }

  async countAll() {
    return this.userModel.countDocuments({ role: { $ne: 'admin' } }).exec();
  }

  async deleteUser(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === 'admin') {
      throw new BadRequestException('Cannot delete admin user');
    }

    await this.userModel.findByIdAndDelete(userId).exec();

    // Also clean up user progress
    try {
      const UserProgress = require(path.resolve(__dirname, '../../src/models')).UserProgress;
      await UserProgress.deleteMany({ user_id: this.toObjectId(userId) });
    } catch {
      // Silently ignore if UserProgress model is not available
    }

    return { message: 'User deleted successfully' };
  }

  async adminUpdatePassword(userId: string, newPassword: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    return { message: 'Password updated successfully' };
  }

  private async ensureUserExists(userId: string) {
    const user = await this.userModel.findById(userId).select('_id').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private toObjectId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }
    return new mongoose.Types.ObjectId(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Situation, SituationDocument } from './schemas/situation.schema';
import { UserListeningProgress, UserListeningProgressDocument } from './schemas/user-listening-progress.schema';

@Injectable()
export class SituationService {
  constructor(
    @InjectModel(Situation.name) private situationModel: Model<SituationDocument>,
    @InjectModel(UserListeningProgress.name) private progressModel: Model<UserListeningProgressDocument>,
  ) {}

  async findAll() {
    const situations = await this.situationModel.find().select('-scripts').exec();
    return { data: situations.map(sit => ({
      id: sit._id,
      title_vn: sit.title_vn,
      title_jp: sit.title_jp,
      duration: sit.duration
    })) };
  }

  async findOneWithDetails(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid ID');
    const situation = await this.situationModel.findById(id).exec();
    if (!situation) throw new NotFoundException('Situation not found');

    return {
      id: situation._id,
      title_vn: situation.title_vn,
      title_jp: situation.title_jp,
      main_audio_url: situation.main_audio_url,
      duration: situation.duration,
      scripts: situation.scripts.map((s: any, idx: number) => ({
        id: s._id?.toString() || `sub_${idx}`,
        speaker_name: s.speaker_name,
        content_jp: s.content_jp,
        content_vn: s.content_vn,
        start_time: s.start_time,
        end_time: s.end_time,
        order_index: s.order_index
      }))
    };
  }

  async updateProgress(userId: string, situationId: string, progressSeconds: number) {
    if (!Types.ObjectId.isValid(situationId)) throw new NotFoundException('Invalid ID');
    const situation = await this.situationModel.findById(situationId).exec();
    if (!situation) throw new NotFoundException('Situation not found');

    const userObjectId = new Types.ObjectId(userId);
    const situationObjectId = new Types.ObjectId(situationId);

    let progress = await this.progressModel.findOne({ user_id: userObjectId, situation_id: situationObjectId });
    if (!progress) {
      progress = new this.progressModel({ user_id: userObjectId, situation_id: situationObjectId });
    }

    if (progressSeconds > progress.highest_progress_seconds) {
      progress.highest_progress_seconds = progressSeconds;
    }

    let newlyUnlocked: string[] = [];
    if (!progress.is_completed && progressSeconds >= situation.duration) {
      progress.is_completed = true;
      // Fetch user to add badge
      // In a real app we should use dependency injection for UserService or UserModel
      // For now, assume we can return the condition to be handled by another service or just simulate it.
      newlyUnlocked.push('LISTENING');
    }

    await progress.save();

    return {
      success: true,
      progress_seconds: progress.highest_progress_seconds,
      is_completed: progress.is_completed,
      newly_unlocked_badges: newlyUnlocked
    };
  }
}


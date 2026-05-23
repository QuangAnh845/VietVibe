import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserListeningProgressDocument = UserListeningProgress & Document;

@Schema({ timestamps: true })
export class UserListeningProgress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Situation', required: true })
  situation_id: Types.ObjectId;

  @Prop({ default: 0 })
  highest_progress_seconds: number;

  @Prop({ default: false })
  is_completed: boolean;
}

export const UserListeningProgressSchema = SchemaFactory.createForClass(UserListeningProgress);

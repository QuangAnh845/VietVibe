import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class User {
  @Prop({ type: String, enum: ['learner', 'admin'], default: 'learner' })
  role!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password_hash!: string;

  @Prop({ required: true, trim: true })
  user_name!: string;

  @Prop({ type: String, default: null })
  full_name!: string | null;

  @Prop({ type: String, default: null })
  avatar_url!: string | null;

  @Prop({
    type: {
      playback_speed: { type: Number, default: 1.0 },
      auto_pause: { type: Boolean, default: false },
      environment_sound_id: { type: Types.ObjectId, ref: 'EnvironmentSound', default: null },
      environment_volume: { type: Number, default: 50 }
    },
    default: {
      playback_speed: 1.0,
      auto_pause: false,
      environment_sound_id: null,
      environment_volume: 50
    }
  })
  listening_settings!: {
    playback_speed: number;
    auto_pause: boolean;
    environment_sound_id: any | null;
    environment_volume: number;
  };

  @Prop({ type: [{ type: String, enum: ['LISTENING', 'SPEAKING', 'READING'] }], default: [] })
  badges!: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

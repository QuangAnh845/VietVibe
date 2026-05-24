import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountLockoutDocument = AccountLockout & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class AccountLockout {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, index: true })
  user_id?: Types.ObjectId;

  @Prop({ required: true, index: true, unique: true })
  email!: string;

  @Prop({ type: Number, default: 0 })
  failed_attempts!: number;

  @Prop({ type: Date, default: null })
  locked_until!: Date | null;

  @Prop({ type: String, enum: ['active', 'locked'], default: 'active' })
  status!: string;

  @Prop({ type: String, default: null })
  last_failed_ip!: string | null;

  @Prop({ type: String, default: null })
  last_failed_user_agent!: string | null;

  @Prop({ type: Date, default: null })
  last_failed_at!: Date | null;

  @Prop({ type: String, default: null })
  unlock_reason!: string | null;

  @Prop({ type: Date, default: null })
  unlocked_at!: Date | null;
}

export const AccountLockoutSchema = SchemaFactory.createForClass(AccountLockout);

// Index: auto-unlock at locked_until time
AccountLockoutSchema.index({ locked_until: 1 }, { expireAfterSeconds: 0, sparse: true });

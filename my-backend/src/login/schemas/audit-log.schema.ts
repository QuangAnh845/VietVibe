import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  user_id!: Types.ObjectId | null;

  @Prop({ required: true, index: true })
  email!: string;

  @Prop({
    type: String,
    enum: [
      'login_success',
      'login_failed',
      'logout',
      'register',
      'password_changed',
      'password_reset',
      'token_revoked',
      'token_refresh',
      'account_locked',
      'account_unlocked',
      'invalid_token',
      'permission_denied',
    ],
    required: true,
  })
  action!: string;

  @Prop({ type: String, default: null })
  status!: string | null;

  @Prop({ type: String, default: null })
  ip_address!: string | null;

  @Prop({ type: String, default: null })
  user_agent!: string | null;

  @Prop({ type: String, default: null })
  error_message!: string | null;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, any>;

  @Prop({ type: Number, default: null })
  duration_ms!: number | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Index: auto-delete after 90 days
AuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

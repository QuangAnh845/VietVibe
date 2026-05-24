import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema.js';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Log authentication event
   */
  async logAuthEvent(
    email: string,
    action: string,
    status: string,
    options?: {
      user_id?: string;
      ip_address?: string;
      user_agent?: string;
      error_message?: string;
      metadata?: Record<string, any>;
      duration_ms?: number;
    },
  ): Promise<AuditLogDocument> {
    const log = await this.auditLogModel.create({
      email,
      action,
      status,
      user_id: options?.user_id || null,
      ip_address: options?.ip_address || null,
      user_agent: options?.user_agent || null,
      error_message: options?.error_message || null,
      metadata: options?.metadata || {},
      duration_ms: options?.duration_ms || null,
    });

    return log;
  }

  /**
   * Get user's audit history
   */
  async getUserAuditHistory(
    email: string,
    limit: number = 50,
  ): Promise<AuditLogDocument[]> {
    return this.auditLogModel
      .find({ email })
      .sort({ created_at: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get failed login attempts
   */
  async getFailedLoginAttempts(
    email: string,
    hours: number = 24,
  ): Promise<number> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const count = await this.auditLogModel.countDocuments({
      email,
      action: 'login_failed',
      created_at: { $gte: startTime },
    });

    return count;
  }

  /**
   * Get suspicious activities
   */
  async getSuspiciousActivities(hours: number = 24): Promise<AuditLogDocument[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.auditLogModel
      .find({
        $or: [
          { action: 'login_failed', status: 'failed' },
          { action: 'permission_denied' },
          { action: 'invalid_token' },
        ],
        created_at: { $gte: startTime },
      })
      .sort({ created_at: -1 })
      .limit(100)
      .exec();
  }

  /**
   * Clean old audit logs (older than 90 days)
   */
  async cleanOldLogs(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.auditLogModel.deleteMany({
      created_at: { $lt: ninetyDaysAgo },
    });

    return result.deletedCount;
  }
}

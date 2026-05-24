import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountLockout, AccountLockoutDocument } from '../schemas/account-lockout.schema.js';

@Injectable()
export class AccountLockoutService {
  constructor(
    @InjectModel(AccountLockout.name)
    private accountLockoutModel: Model<AccountLockoutDocument>,
  ) {}

  /**
   * Get or create lockout record
   */
  async getOrCreateLockoutRecord(
    email: string,
    userId?: string,
  ): Promise<AccountLockoutDocument> {
    let record = await this.accountLockoutModel.findOne({ email }).exec();

    if (!record) {
      record = await this.accountLockoutModel.create({
        email,
        user_id: userId,
        failed_attempts: 0,
        status: 'active',
      });
    }

    return record;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(
    email: string,
    ip: string,
    userAgent: string,
  ): Promise<AccountLockoutDocument> {
    const record = await this.getOrCreateLockoutRecord(email);

    const attempts = record.failed_attempts + 1;
    let lockedUntil: Date | null = null;

    // Exponential backoff:
    // 1-4 tries: no lock
    // 5-9 tries: lock 15 min
    // 10+ tries: lock 1 hour
    if (attempts >= 10) {
      lockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    } else if (attempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }

    const updated = await this.accountLockoutModel.findOneAndUpdate(
      { email },
      {
        failed_attempts: attempts,
        last_failed_at: new Date(),
        last_failed_ip: ip,
        last_failed_user_agent: userAgent,
        locked_until: lockedUntil,
        status: lockedUntil ? 'locked' : 'active',
      },
      { new: true },
    );

    return updated!;
  }

  /**
   * Record successful login (reset attempts)
   */
  async recordSuccessfulLogin(email: string): Promise<void> {
    await this.accountLockoutModel.updateOne(
      { email },
      {
        failed_attempts: 0,
        locked_until: null,
        status: 'active',
        last_failed_at: null,
      },
    );
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(email: string): Promise<boolean> {
    const record = await this.accountLockoutModel.findOne({ email }).exec();

    if (!record) return false;

    if (record.locked_until && record.locked_until > new Date()) {
      return true;
    }

    // Auto-unlock if lock time expired
    if (record.locked_until && record.locked_until <= new Date()) {
      await this.accountLockoutModel.updateOne(
        { email },
        {
          locked_until: null,
          status: 'active',
        },
      );
      return false;
    }

    return false;
  }

  /**
   * Get lockout info
   */
  async getLockoutInfo(email: string): Promise<{
    is_locked: boolean;
    failed_attempts: number;
    locked_until?: Date | null;
    unlock_in_minutes?: number;
  }> {
    const record = await this.accountLockoutModel.findOne({ email }).exec();

    if (!record) {
      return {
        is_locked: false,
        failed_attempts: 0,
      };
    }

    const isLocked = record.locked_until && record.locked_until > new Date();

    if (isLocked) {
      const now = new Date();
      const diffMs = record.locked_until!.getTime() - now.getTime();
      const diffMin = Math.ceil(diffMs / 60000);

      return {
        is_locked: true,
        failed_attempts: record.failed_attempts,
        locked_until: record.locked_until,
        unlock_in_minutes: diffMin,
      };
    }

    return {
      is_locked: false,
      failed_attempts: record.failed_attempts,
    };
  }

  /**
   * Admin unlock account
   */
  async unlockAccount(email: string, reason: string): Promise<void> {
    await this.accountLockoutModel.updateOne(
      { email },
      {
        failed_attempts: 0,
        locked_until: null,
        status: 'active',
        unlock_reason: reason,
        unlocked_at: new Date(),
      },
    );
  }

  /**
   * Admin manual lock account
   */
  async lockAccount(email: string, reason: string, durationMinutes: number = 60): Promise<void> {
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    await this.accountLockoutModel.updateOne(
      { email },
      {
        locked_until: lockedUntil,
        status: 'locked',
        unlock_reason: reason,
      },
      { upsert: true },
    );
  }
}

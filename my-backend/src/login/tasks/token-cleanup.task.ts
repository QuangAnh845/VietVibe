import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenBlacklistService } from '../services/token-blacklist.service.js';
import { AuditLogService } from '../services/audit-log.service.js';

/**
 * Token & Audit Log Cleanup Task
 * Automatically remove expired blacklist entries and old audit logs
 * Runs daily at 2:00 AM
 */
@Injectable()
export class TokenCleanupTask {
  constructor(
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredTokensAndLogs() {
    try {
      const deletedTokens = await this.tokenBlacklistService.cleanExpiredTokens();
      console.log(`[TokenCleanupTask] Removed ${deletedTokens} expired tokens from blacklist`);

      const deletedLogs = await this.auditLogService.cleanOldLogs();
      console.log(`[TokenCleanupTask] Removed ${deletedLogs} old audit logs (older than 90 days)`);
    } catch (error) {
      console.error('[TokenCleanupTask] Error during cleanup:', error);
    }
  }
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginController } from './login.controller.js';
import { LoginService } from './login.service.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { TokenBlacklist, TokenBlacklistSchema } from './schemas/token-blacklist.schema.js';
import { AccountLockout, AccountLockoutSchema } from './schemas/account-lockout.schema.js';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema.js';
import { JwtUtilsService } from './services/jwt-utils.service.js';
import { TokenBlacklistService } from './services/token-blacklist.service.js';
import { AccountLockoutService } from './services/account-lockout.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { TokenCleanupTask } from './tasks/token-cleanup.task.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TokenBlacklist.name, schema: TokenBlacklistSchema },
      { name: AccountLockout.name, schema: AccountLockoutSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [LoginController],
  providers: [
    LoginService,
    JwtUtilsService,
    TokenBlacklistService,
    AccountLockoutService,
    AuditLogService,
    JwtAuthGuard,
    TokenCleanupTask,
  ],
  exports: [JwtAuthGuard, JwtUtilsService, TokenBlacklistService, AccountLockoutService, AuditLogService],
})
export class LoginModule {}

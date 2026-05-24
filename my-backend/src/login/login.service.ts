import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RevokeTokenDto } from './dto/revoke-token.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtUtilsService } from './services/jwt-utils.service.js';
import { TokenBlacklistService } from './services/token-blacklist.service.js';
import { AccountLockoutService } from './services/account-lockout.service.js';
import { AuditLogService } from './services/audit-log.service.js';

@Injectable()
export class LoginService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtUtilsService: JwtUtilsService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly accountLockoutService: AccountLockoutService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async validateUser(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account is locked
    const isLocked = await this.accountLockoutService.isAccountLocked(normalizedEmail);
    if (isLocked) {
      const lockoutInfo = await this.accountLockoutService.getLockoutInfo(normalizedEmail);
      await this.auditLogService.logAuthEvent(normalizedEmail, 'login_failed', 'account_locked', {
        ip_address: ipAddress,
        user_agent: userAgent,
        error_message: `Account locked. Unlock in ${lockoutInfo.unlock_in_minutes} minutes`,
      });
      throw new UnauthorizedException(
        `アカウントが一時的にロックされています。${lockoutInfo.unlock_in_minutes}分後にもう一度お試しください`,
      );
    }

    // Find user
    const user = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (!user) {
      // Log failed attempt (email not found)
      await this.accountLockoutService.recordFailedAttempt(normalizedEmail, ipAddress || 'unknown', userAgent || 'unknown');
      await this.auditLogService.logAuthEvent(normalizedEmail, 'login_failed', 'invalid_email', {
        ip_address: ipAddress,
        user_agent: userAgent,
        error_message: 'Email not found',
      });
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    // Compare password
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      // Log failed attempt + record lockout
      const lockoutRecord = await this.accountLockoutService.recordFailedAttempt(
        normalizedEmail,
        ipAddress || 'unknown',
        userAgent || 'unknown',
      );
      await this.auditLogService.logAuthEvent(normalizedEmail, 'login_failed', 'invalid_password', {
        user_id: user._id.toString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        error_message: 'Invalid password',
        metadata: {
          failed_attempts: lockoutRecord.failed_attempts,
          account_status: lockoutRecord.status,
        },
      });

      if (lockoutRecord.locked_until && lockoutRecord.locked_until > new Date()) {
        const lockoutInfo = await this.accountLockoutService.getLockoutInfo(normalizedEmail);
        throw new UnauthorizedException(
          `アカウントが一時的にロックされています。${lockoutInfo.unlock_in_minutes}分後にもう一度お試しください`,
        );
      }

      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    // Password match - reset lockout
    await this.accountLockoutService.recordSuccessfulLogin(normalizedEmail);

    return user;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password, ipAddress, userAgent);
    const userId = user._id.toString();

    const access_token = this.jwtUtilsService.generateAccessToken(
      userId,
      user.email,
      user.role,
    );
    const refresh_token = this.jwtUtilsService.generateRefreshToken(
      userId,
      user.email,
      user.role,
    );

    // Log successful login
    await this.auditLogService.logAuthEvent(user.email, 'login_success', 'success', {
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: userId,
        email: user.email,
        user_name: user.user_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase().trim();
    const name = registerDto.name.trim();

    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      await this.auditLogService.logAuthEvent(email, 'register', 'failed', {
        error_message: 'Email already exists',
      });
      throw new BadRequestException('このメールアドレスはすでに使用されています');
    }

    const password_hash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userModel.create({
      email,
      user_name: name,
      password_hash,
    });

    const userId = user._id.toString();

    const access_token = this.jwtUtilsService.generateAccessToken(
      userId,
      user.email,
      user.role,
    );
    const refresh_token = this.jwtUtilsService.generateRefreshToken(
      userId,
      user.email,
      user.role,
    );

    // Log successful registration
    await this.auditLogService.logAuthEvent(email, 'register', 'success', {
      user_id: userId,
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: userId,
        email: user.email,
        user_name: user.user_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    };
  }

  /**
   * Revoke single token - gọi trước logout
   */
  async revokeToken(token: string, revokeDto?: RevokeTokenDto) {
    const payload = this.jwtUtilsService.verifyToken(token);
    const expirationDate = this.jwtUtilsService.getTokenExpirationDate(token);
    const reason = revokeDto?.reason || 'logout';

    await this.tokenBlacklistService.revokeToken(
      token,
      payload.sub,
      payload.email,
      expirationDate,
      reason,
    );

    return {
      success: true,
      message: 'Token successfully revoked',
      revoked_at: new Date(),
    };
  }

  /**
   * Revoke all tokens của user - logout from all devices
   */
  async revokeAllTokens(token: string, reason: string = 'logout') {
    const payload = this.jwtUtilsService.verifyToken(token);
    const user = await this.userModel.findById(payload.sub).exec();

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    // Revoke current token
    const expirationDate = this.jwtUtilsService.getTokenExpirationDate(token);
    await this.tokenBlacklistService.revokeToken(
      token,
      payload.sub,
      payload.email,
      expirationDate,
      reason,
    );

    const tokens_revoked = await this.tokenBlacklistService.getUserRevokedTokenCount(
      payload.sub,
    );

    return {
      success: true,
      message: 'All tokens revoked successfully',
      tokens_revoked: tokens_revoked + 1,
      revoked_at: new Date(),
    };
  }

  /**
   * Refresh access token sử dụng refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const payload = this.jwtUtilsService.verifyToken(refreshTokenDto.refresh_token);

    // Check token type
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type. Expected refresh token.');
    }

    // Check nếu token bị revoke
    const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(
      refreshTokenDto.refresh_token,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token が無効です。再度ログインしてください');
    }

    // Generate new tokens
    const new_access_token = this.jwtUtilsService.generateAccessToken(
      payload.sub,
      payload.email,
      payload.role,
    );
    const new_refresh_token = this.jwtUtilsService.generateRefreshToken(
      payload.sub,
      payload.email,
      payload.role,
    );

    // Revoke old refresh token (rotation)
    const expirationDate = this.jwtUtilsService.getTokenExpirationDate(
      refreshTokenDto.refresh_token,
    );
    await this.tokenBlacklistService.revokeToken(
      refreshTokenDto.refresh_token,
      payload.sub,
      payload.email,
      expirationDate,
      'token_rotation',
    );

    const expires_in = this.jwtUtilsService.getTokenExpirationInSeconds(new_access_token);

    return {
      access_token: new_access_token,
      refresh_token: new_refresh_token,
      expires_in,
    };
  }

  /**
   * Logout - revoke current token
   */
  async logout(token: string) {
    const payload = this.jwtUtilsService.verifyToken(token);
    await this.revokeToken(token, { reason: 'logout' });

    // Log logout event
    await this.auditLogService.logAuthEvent(payload.email, 'logout', 'success', {
      user_id: payload.sub,
    });

    return {
      success: true,
      message: 'ログアウトしました',
    };
  }

  /**
   * Change password (user must provide current password)
   */
  async changePassword(token: string, changePasswordDto: ChangePasswordDto) {
    const payload = this.jwtUtilsService.verifyToken(token);
    const user = await this.userModel.findById(payload.sub).exec();

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    // Verify current password
    const passwordMatches = await bcrypt.compare(
      changePasswordDto.current_password,
      user.password_hash,
    );
    if (!passwordMatches) {
      await this.auditLogService.logAuthEvent(user.email, 'password_changed', 'failed', {
        user_id: user._id.toString(),
        error_message: 'Current password incorrect',
      });
      throw new UnauthorizedException('現在のパスワードが正しくありません');
    }

    // Verify passwords match
    if (changePasswordDto.new_password !== changePasswordDto.confirm_password) {
      throw new BadRequestException('新しいパスワードが一致しません');
    }

    // Verify new password != old password
    if (changePasswordDto.current_password === changePasswordDto.new_password) {
      throw new BadRequestException('新しいパスワードは現在のパスワードと異なる必要があります');
    }

    // Hash new password
    const new_password_hash = await bcrypt.hash(changePasswordDto.new_password, 10);

    // Update password
    await this.userModel.updateOne(
      { _id: user._id },
      { password_hash: new_password_hash },
    );

    // Revoke all tokens (force re-login everywhere)
    await this.revokeAllTokens(token, 'password_changed');

    // Log password change
    await this.auditLogService.logAuthEvent(user.email, 'password_changed', 'success', {
      user_id: user._id.toString(),
      metadata: {
        reason: changePasswordDto.reason || 'user_initiated',
        all_tokens_revoked: true,
      },
    });

    return {
      success: true,
      message: 'パスワードが正常に変更されました',
      data: {
        changed_at: new Date().toISOString(),
        user_id: user._id.toString(),
        email: user.email,
        all_tokens_revoked: true,
      },
    };
  }

  /**
   * Get user's audit history
   */
  async getAuditHistory(token: string, limit: number = 50) {
    const payload = this.jwtUtilsService.verifyToken(token);

    const history = await this.auditLogService.getUserAuditHistory(payload.email, limit);

    return {
      success: true,
      data: history,
      meta: {
        total: history.length,
      },
    };
  }
}

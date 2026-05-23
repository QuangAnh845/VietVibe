import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RevokeTokenDto } from './dto/revoke-token.dto.js';
import { JwtUtilsService } from './services/jwt-utils.service.js';
import { TokenBlacklistService } from './services/token-blacklist.service.js';

@Injectable()
export class LoginService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtUtilsService: JwtUtilsService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
    if (!user) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
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
    await this.revokeToken(token, { reason: 'logout' });
    return {
      success: true,
      message: 'ログアウトしました',
    };
  }
}

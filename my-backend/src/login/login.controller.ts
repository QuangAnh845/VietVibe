import { Body, Controller, HttpCode, Post, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiResponse, ApiOperation, ApiBody } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refresh-token.dto.js';
import { RevokeTokenDto } from './dto/revoke-token.dto.js';
import { ChangePasswordDto, ChangePasswordResponseDto } from './dto/change-password.dto.js';
import { LoginService } from './login.service.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { RevokeTokenResponseDto, RevokeAllTokensResponseDto, LogoutResponseDto } from './dto/revoke-response.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@ApiTags('auth')
@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'ユーザーログイン',
    description: 'メールアドレスとパスワードでログイン、access_token と refresh_token を返す',
  })
  @ApiResponse({
    status: 200,
    description: 'ログイン成功',
    type: LoginResponseDto,
  })
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<LoginResponseDto & { refresh_token: string }> {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return this.loginService.login(loginDto, ipAddress, userAgent);
  }

  @Post('register')
  @HttpCode(201)
  @ApiOperation({
    summary: 'ユーザー登録',
    description: '新規ユーザーを登録、access_token と refresh_token を返す',
  })
  @ApiResponse({
    status: 201,
    description: '登録成功',
    type: LoginResponseDto,
  })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto & { refresh_token: string }> {
    return this.loginService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Access Token 更新',
    description: 'Refresh Token を使用して新しい Access Token を取得 (Refresh Token Rotation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Token 更新成功',
    type: RefreshTokenResponseDto,
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    return this.loginService.refreshToken(refreshTokenDto);
  }

  @Post('revoke')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiBody({ type: RevokeTokenDto, required: false })
  @ApiOperation({
    summary: '現在の Token を無効化',
    description: '現在のアクセストークンを無効化（ブラックリスト登録）',
  })
  @ApiResponse({
    status: 200,
    description: 'Token 無効化成功',
    type: RevokeTokenResponseDto,
  })
  async revokeToken(@Request() req: any, @Body() revokeDto?: RevokeTokenDto): Promise<RevokeTokenResponseDto> {
    return this.loginService.revokeToken(req.token, revokeDto);
  }

  @Post('revoke-all')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'すべてのデバイスからログアウト',
    description: 'ユーザーの全トークンを無効化（全デバイスからログアウト）',
  })
  @ApiResponse({
    status: 200,
    description: 'すべてのトークン無効化成功',
    type: RevokeAllTokensResponseDto,
  })
  async revokeAllTokens(@Request() req: any): Promise<RevokeAllTokensResponseDto> {
    return this.loginService.revokeAllTokens(req.token, 'manual_revoke_all');
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'ログアウト',
    description: '現在のトークンを無効化してログアウト',
  })
  @ApiResponse({
    status: 200,
    description: 'ログアウト成功',
    type: LogoutResponseDto,
  })
  async logout(@Request() req: any): Promise<LogoutResponseDto> {
    return this.loginService.logout(req.token);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'パスワード変更',
    description: '現在のパスワードを検証後、新しいパスワードに変更。全トークンは無効化される',
  })
  @ApiResponse({
    status: 200,
    description: 'パスワード変更成功',
    type: ChangePasswordResponseDto,
  })
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto): Promise<ChangePasswordResponseDto> {
    return this.loginService.changePassword(req.token, changePasswordDto);
  }

  @Get('audit-history')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'ユーザーの監査ログ取得',
    description: 'ユーザーの全認証イベント履歴を取得',
  })
  @ApiResponse({
    status: 200,
    description: '監査ログ取得成功',
  })
  async getAuditHistory(@Request() req: any): Promise<any> {
    return this.loginService.getAuditHistory(req.token);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPass123!',
    required: true,
  })
  @IsString()
  @MinLength(1, { message: '現在のパスワードを入力してください' })
  current_password: string;

  @ApiProperty({
    description: 'New password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)',
    example: 'NewPass456!',
    required: true,
  })
  @IsString()
  @MinLength(8, { message: 'パスワードは最小8文字である必要があります' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])/, {
    message:
      'パスワードは大文字、小文字、数字、特殊文字(!@#$%^&*)を含む必要があります',
  })
  new_password: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPass456!',
    required: true,
  })
  @IsString()
  confirm_password: string;

  @ApiProperty({
    description: 'Reason for password change (optional)',
    example: 'security_issue',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'パスワードが正常に変更されました' })
  message: string;

  @ApiProperty({
    example: {
      changed_at: '2026-05-24T10:00:00Z',
      user_id: '507f1f77bcf86cd799439011',
      email: 'user@gmail.com',
      all_tokens_revoked: true,
    },
  })
  data?: {
    changed_at: string;
    user_id: string;
    email: string;
    all_tokens_revoked: boolean;
  };
}

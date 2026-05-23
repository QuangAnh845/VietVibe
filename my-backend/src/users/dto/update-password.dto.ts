import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ example: 'oldpassword123', description: 'Current password' })
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'newpassword123', description: 'New password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

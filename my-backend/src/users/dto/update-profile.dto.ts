import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Thanh Ha', description: 'User full name or user name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  user_name?: string;

  @ApiProperty({ example: 'thanhha@gmail.com', description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

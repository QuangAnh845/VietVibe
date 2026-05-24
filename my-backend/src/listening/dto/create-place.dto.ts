import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePlaceDto {
  @ApiProperty({ type: String, description: 'Vietnamese place name', example: 'Siêu thị' })
  @IsString()
  @IsNotEmpty()
  nameVi: string;

  @ApiProperty({ type: String, description: 'Japanese place name', example: 'スーパー' })
  @IsString()
  @IsNotEmpty()
  nameJa: string;

  @ApiPropertyOptional({ type: String, description: 'Optional place description', example: 'Khu vực mua sắm hàng ngày' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String, description: 'Optional avatar URL', example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

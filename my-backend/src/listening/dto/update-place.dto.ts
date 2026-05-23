import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePlaceDto {
  @ApiPropertyOptional({ type: String, description: 'Vietnamese place name', example: 'Siêu thị' })
  @IsOptional()
  @IsString()
  nameVi?: string;

  @ApiPropertyOptional({ type: String, description: 'Japanese place name', example: 'スーパー' })
  @IsOptional()
  @IsString()
  nameJa?: string;

  @ApiPropertyOptional({ type: String, description: 'Optional place description', example: 'Khu vực mua sắm hàng ngày' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String, description: 'Optional avatar URL', example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSituationDto {
  @ApiProperty({ type: String, description: 'Place id that this situation belongs to', example: '66e480c7b1d5f22bb88bcd73' })
  @IsMongoId()
  placeId: string;

  @ApiProperty({ type: String, description: 'Vietnamese title for the situation', example: 'Mua sắm tại siêu thị' })
  @IsString()
  @IsNotEmpty()
  titleVi: string;

  @ApiProperty({ type: String, description: 'Japanese title for the situation', example: 'スーパーで買い物する' })
  @IsString()
  @IsNotEmpty()
  titleJa: string;

  @ApiPropertyOptional({ type: String, description: 'Optional situation description', example: 'Tình huống giao tiếp tại siêu thị' })
  @IsOptional()
  @IsString()
  description?: string;
}

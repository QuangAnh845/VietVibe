import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateLearningUnitDto {
  @ApiPropertyOptional({ type: String, description: 'Situation id that this learning unit belongs to' })
  @IsOptional()
  @IsMongoId()
  situationId?: string;

  @ApiPropertyOptional({ type: String, description: 'Level id for this learning unit' })
  @IsOptional()
  @IsMongoId()
  levelId?: string;

  @ApiPropertyOptional({ type: String, description: 'Vietnamese title for the learning unit' })
  @IsOptional()
  @IsString()
  titleVi?: string;

  @ApiPropertyOptional({ type: String, description: 'Japanese title for the learning unit' })
  @IsOptional()
  @IsString()
  titleJa?: string;

  @ApiPropertyOptional({ type: String, description: 'Optional learning unit description' })
  @IsOptional()
  @IsString()
  description?: string;
}

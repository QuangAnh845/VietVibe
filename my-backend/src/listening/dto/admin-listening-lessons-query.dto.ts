import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AdminListeningLessonsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by place id' })
  @IsOptional()
  @IsString()
  placeId?: string;

  @ApiPropertyOptional({ description: 'Filter by situation id' })
  @IsOptional()
  @IsString()
  situationId?: string;

  @ApiPropertyOptional({ description: 'Filter by learning unit id' })
  @IsOptional()
  @IsString()
  learningUnitId?: string;

  @ApiPropertyOptional({ description: 'Search lesson title' })
  @IsOptional()
  @IsString()
  q?: string;
}

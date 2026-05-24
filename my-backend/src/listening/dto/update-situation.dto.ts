import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class UpdateSituationDto {
  @ApiPropertyOptional({ type: String, description: 'Place id that this situation belongs to' })
  @IsOptional()
  @IsMongoId()
  placeId?: string;

  @ApiPropertyOptional({ type: String, description: 'Vietnamese title for the situation' })
  @IsOptional()
  @IsString()
  titleVi?: string;

  @ApiPropertyOptional({ type: String, description: 'Japanese title for the situation' })
  @IsOptional()
  @IsString()
  titleJa?: string;

  @ApiPropertyOptional({ type: String, description: 'Optional situation description' })
  @IsOptional()
  @IsString()
  description?: string;
}

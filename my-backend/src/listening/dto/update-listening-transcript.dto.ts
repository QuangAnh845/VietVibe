import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TranscriptLineDto } from '../transcript-line.dto';

export class UpdateListeningTranscriptDto {
  @ApiPropertyOptional({ type: [TranscriptLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptLineDto)
  transcriptLines: TranscriptLineDto[];

  @ApiPropertyOptional({ description: 'Lesson duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Updated audio URL after upload' })
  @IsOptional()
  @IsString()
  audioUrl?: string;
}

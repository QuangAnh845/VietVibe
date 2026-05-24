import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DraftTranscriptLineDto } from './draft-transcript-line.dto.js';

export enum AutoSaveContentType {
  VOCABULARY = 'VOCABULARY',
  LISTENING = 'LISTENING',
}

export class BaseAutoSaveDto {
  @ApiPropertyOptional({
    enum: AutoSaveContentType,
    description: 'Content area being edited. Required when creating a new draft.',
  })
  @IsEnum(AutoSaveContentType)
  contentType: AutoSaveContentType;

  @ApiPropertyOptional({ description: 'Existing vocabulary card or listening lesson id.' })
  @IsMongoId()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Vocabulary learning unit id.' })
  @IsMongoId()
  learning_unit_id?: string;

  @ApiPropertyOptional({ description: 'Listening learning unit id.' })
  @IsMongoId()
  learningUnitId?: string;

  @ApiPropertyOptional({ description: 'Vietnamese vocabulary word.' })
  @IsString()
  word_vi?: string;

  @ApiPropertyOptional({ description: 'Japanese vocabulary meaning.' })
  @IsString()
  meaning_ja?: string;

  @ApiPropertyOptional({ description: 'Vietnamese example sentence.' })
  @IsString()
  example_vi?: string;

  @ApiPropertyOptional({ description: 'Japanese example sentence.' })
  @IsString()
  example_ja?: string;

  @ApiPropertyOptional({ description: 'Vocabulary note.' })
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Vocabulary tag.' })
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Listening Vietnamese title.' })
  @IsString()
  titleVi?: string;

  @ApiPropertyOptional({ description: 'Listening Japanese title.' })
  @IsString()
  titleJa?: string;

  @ApiPropertyOptional({ description: 'Listening audio URL.' })
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'Listening duration in seconds.' })
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Listening description.' })
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [DraftTranscriptLineDto], description: 'Partial transcript lines.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftTranscriptLineDto)
  transcriptLines?: DraftTranscriptLineDto[];
}

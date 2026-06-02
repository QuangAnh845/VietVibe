import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsMongoId, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TranscriptLineDto } from '../transcript-line.dto';

export class UpdateListeningDto {
  @ApiPropertyOptional({ type: String, description: 'Learning unit id that this listening lesson belongs to', example: '6a0062476ba452f577db7e77' })
  @IsOptional()
  @IsMongoId()
  learningUnitId?: string;

  @ApiPropertyOptional({ type: String, description: 'Vietnamese title for the listening lesson', example: 'Thanh toán tại cửa hàng' })
  @IsOptional()
  @IsString()
  titleVi?: string;

  @ApiPropertyOptional({ type: String, description: 'Japanese title for the listening lesson', example: '店での支払い' })
  @IsOptional()
  @IsString()
  titleJa?: string;

  @ApiPropertyOptional({ type: String, description: 'Audio URL for the listening lesson', example: 'https://example.com/audio.mp3' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ type: Number, description: 'Duration of the audio in seconds', example: 68 })
  @IsOptional()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ type: String, description: 'Description for the listening lesson', example: 'Bài nghe về thanh toán tại quán ăn.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [TranscriptLineDto], description: 'Transcript lines for the lesson' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptLineDto)
  transcriptLines?: TranscriptLineDto[];

  @ApiPropertyOptional({ type: [String], description: 'Environment sound ids allowed for this lesson' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  ambientSoundIds?: string[];
}

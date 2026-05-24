import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DraftTranscriptLineDto {
  @ApiPropertyOptional({ type: Number, description: 'Transcript start time in seconds.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startTime?: number;

  @ApiPropertyOptional({ type: Number, description: 'Transcript end time in seconds.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endTime?: number;

  @ApiPropertyOptional({ type: String, description: 'Vietnamese transcript text.' })
  @IsOptional()
  @IsString()
  textVi?: string;

  @ApiPropertyOptional({ type: String, description: 'Japanese transcript text.' })
  @IsOptional()
  @IsString()
  textJa?: string;
}

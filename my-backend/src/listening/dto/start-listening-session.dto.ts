import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  AMBIENT_SOUNDS,
  PLAYBACK_MODES,
  PLAYBACK_SPEEDS,
  normalizeAmbientSound,
  normalizeAmbientVolume,
  normalizePlaybackMode,
  normalizePlaybackSpeed,
  type AmbientSound,
  type PlaybackMode,
  type PlaybackSpeed,
} from '../listening-session.constants';

export class StartListeningSessionDto {

  @ApiPropertyOptional({
    type: Number,
    description: 'Initial playback position in seconds',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentPositionSeconds?: number;

  @ApiPropertyOptional({
    oneOf: [{ type: 'number' }, { type: 'string' }],
    enum: ['0.75x', '1.0x', 0.75, 1],
    description: 'Playback speed. FE sends "0.75x" or "1.0x".',
    example: '1.0x',
  })
  @IsOptional()
  @Transform(({ value }) => normalizePlaybackSpeed(value))
  @IsIn([...PLAYBACK_SPEEDS])
  playbackSpeed?: PlaybackSpeed;

  @ApiPropertyOptional({
    type: String,
    enum: [...PLAYBACK_MODES, 'auto_stop'],
    description: 'Playback mode. "study" stops at the end of each segment.',
    example: 'study',
  })
  @IsOptional()
  @Transform(({ value }) => normalizePlaybackMode(value))
  @IsIn([...PLAYBACK_MODES])
  playbackMode?: PlaybackMode;

  @ApiPropertyOptional({
    type: String,
    enum: [...AMBIENT_SOUNDS, 'off', 'none', 'street'],
    nullable: true,
    description: 'Ambient sound key selected by the user',
    example: 'cafe',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeAmbientSound(value))
  @IsIn([...AMBIENT_SOUNDS])
  ambientSound?: AmbientSound | null;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    maximum: 100,
    description: 'Ambient sound volume percentage',
    example: 40,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeAmbientVolume(value))
  @IsNumber()
  @Min(0)
  @Max(100)
  ambientVolume?: number;
}

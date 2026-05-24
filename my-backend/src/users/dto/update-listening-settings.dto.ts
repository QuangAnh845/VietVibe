import { ApiProperty } from '@nestjs/swagger';

export class UpdateListeningSettingsDto {
  @ApiProperty({ required: false, example: 0.75 })
  playback_speed?: number;

  @ApiProperty({ required: false, example: true })
  auto_pause?: boolean;

  @ApiProperty({ required: false, example: '60d5f...' })
  environment_sound_id?: string;

  @ApiProperty({ required: false, example: 40 })
  environment_volume?: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty({ example: 68.0 })
  progress_seconds: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';

export class UpdateLearningUnitProgressDto {
  @ApiProperty({ enum: ['vocab', 'listen'], example: 'vocab' })
  @IsIn(['vocab', 'listen'])
  field!: 'vocab' | 'listen';

  @ApiProperty({ example: true })
  @IsBoolean()
  completed!: boolean;
}

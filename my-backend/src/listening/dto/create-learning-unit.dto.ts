import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLearningUnitDto {
  @ApiProperty({ type: String, description: 'Situation id that this learning unit belongs to', example: '66e480c7b1d5f22bb88bcd74' })
  @IsMongoId()
  situationId: string;

  @ApiProperty({ type: String, description: 'Level id for this learning unit', example: '66e480c7b1d5f22bb88bcd75' })
  @IsMongoId()
  levelId: string;

  @ApiProperty({ type: String, description: 'Vietnamese title for the learning unit', example: 'Thanh toán tại siêu thị' })
  @IsString()
  @IsNotEmpty()
  titleVi: string;

  @ApiProperty({ type: String, description: 'Japanese title for the learning unit', example: 'スーパーでの支払い' })
  @IsString()
  @IsNotEmpty()
  titleJa: string;

  @ApiPropertyOptional({ type: String, description: 'Optional learning unit description', example: 'Học từ vựng và bài nghe trong tình huống thanh toán.' })
  @IsOptional()
  @IsString()
  description?: string;
}

import { PartialType } from '@nestjs/mapped-types';
import { IsOptional } from 'class-validator';
import { BaseAutoSaveDto } from './base-auto-save.dto.js';

export class AutoSaveDto extends PartialType(BaseAutoSaveDto) {
  @IsOptional()
  contentId?: string;
}

import { Module } from '@nestjs/common';
import { ContentAutoSaveController } from './content-auto-save.controller.js';
import { ContentAutoSaveService } from './content-auto-save.service.js';

@Module({
  controllers: [ContentAutoSaveController],
  providers: [ContentAutoSaveService],
})
export class ContentAutoSaveModule {}

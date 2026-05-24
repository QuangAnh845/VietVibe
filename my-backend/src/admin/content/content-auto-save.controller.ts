import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../login/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../login/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../login/guards/roles.guard.js';
import { AutoSaveDto } from './dto/auto-save.dto.js';
import { ContentAutoSaveService } from './content-auto-save.service.js';

@ApiTags('Admin Content')
@Controller('api/admin/content')
export class ContentAutoSaveController {
  constructor(private readonly contentAutoSaveService: ContentAutoSaveService) {}

  @Patch('auto-save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: '[ADMIN] Auto-save a vocabulary or listening draft',
    description:
      'Upserts partial admin form data as DRAFT content. Missing content fields are accepted for in-progress drafts.',
  })
  @ApiOkResponse({
    description: 'Draft saved',
    schema: {
      example: {
        id: '66524bc2ab11ef001ff20d99',
        status: 'DRAFT',
        savedAt: '2026-05-24T03:30:00.000Z',
      },
    },
  })
  autoSave(@Body() dto: AutoSaveDto) {
    return this.contentAutoSaveService.autoSave(dto);
  }
}

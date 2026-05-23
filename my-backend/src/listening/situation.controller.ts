import { Controller, Get, Param, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SituationService } from './situation.service';

@ApiTags('Situations')
@Controller('situations')
export class SituationController {
  constructor(private readonly situationService: SituationService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các tình huống luyện nghe' })
  findAll() {
    return this.situationService.findAll();
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Lấy chi tiết nội dung tình huống (Audio & Kịch bản)' })
  findOneWithDetails(@Param('id') id: string) {
    return this.situationService.findOneWithDetails(id);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Cập nhật tiến độ học tập' })
  updateProgress(
    @Param('id') id: string,
    @Body() updateDto: import('./dto/update-progress.dto').UpdateProgressDto,
    @Request() req: any
  ) {
    // Assuming auth middleware populates req.user.userId
    const userId = req.user?.userId || '000000000000000000000000'; // Fallback for testing if no auth
    return this.situationService.updateProgress(userId, id, updateDto.progress_seconds);
  }
}


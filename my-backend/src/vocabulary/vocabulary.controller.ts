import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  Body,
  Put,
  Delete,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { GetVocabularyListQueryDto } from './dto/get-vocabulary-list.query';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto';
import { VocabularyService } from './vocabulary.service';
import { JwtAuthGuard } from '../login/guards/jwt-auth.guard';
import { RolesGuard } from '../login/guards/roles.guard';
import { Roles } from '../login/decorators/roles.decorator';

@ApiTags('Vocabulary')
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  // ======================== PUBLIC ENDPOINTS ========================

  @Get()
  @ApiOperation({ summary: 'Get paginated vocabulary list' })
  @ApiOkResponse({ description: 'Paginated vocabulary cards' })
  getVocabularyList(@Query() query: GetVocabularyListQueryDto) {
    return this.vocabularyService.getVocabularyList(query);
  }

  @Get('learning-unit/:learningUnitId')
  @ApiOperation({ summary: 'Get vocabulary list by learning unit' })
  @ApiParam({ name: 'learningUnitId', description: 'Learning unit id' })
  @ApiOkResponse({ description: 'Vocabulary cards for a learning unit' })
  getVocabularyByLearningUnit(@Param('learningUnitId') learningUnitId: string) {
    return this.vocabularyService.getVocabularyByLearningUnit(learningUnitId);
  }

  // ======================== ADMIN CRUD ENDPOINTS ========================

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(201)
  @ApiOperation({
    summary: '[ADMIN] Create new vocabulary card',
    description: 'Only admin can create new vocabulary cards',
  })
  @ApiCreatedResponse({ description: 'Vocabulary card created successfully' })
  async createVocabulary(
    @Body() createDto: CreateVocabularyDto,
    @Request() req: any,
  ) {
    return this.vocabularyService.createVocabulary(createDto);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: '[ADMIN] Get vocabulary card by ID',
    description: 'Only admin can view vocabulary details',
  })
  @ApiParam({ name: 'id', description: 'Vocabulary card ID' })
  @ApiOkResponse({ description: 'Vocabulary card details' })
  async getVocabularyById(@Param('id') id: string) {
    return this.vocabularyService.getVocabularyById(id);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(200)
  @ApiOperation({
    summary: '[ADMIN] Update vocabulary card',
    description: 'Only admin can update vocabulary cards',
  })
  @ApiParam({ name: 'id', description: 'Vocabulary card ID' })
  @ApiOkResponse({ description: 'Vocabulary card updated successfully' })
  async updateVocabulary(
    @Param('id') id: string,
    @Body() updateDto: UpdateVocabularyDto,
  ) {
    return this.vocabularyService.updateVocabulary(id, updateDto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @HttpCode(200)
  @ApiOperation({
    summary: '[ADMIN] Delete vocabulary card',
    description: 'Only admin can delete vocabulary cards',
  })
  @ApiParam({ name: 'id', description: 'Vocabulary card ID' })
  @ApiOkResponse({ description: 'Vocabulary card deleted successfully' })
  @ApiResponse({ status: 404, description: 'Vocabulary card not found' })
  async deleteVocabulary(@Param('id') id: string) {
    return this.vocabularyService.deleteVocabulary(id);
  }

  @Get('admin/list/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: '[ADMIN] Get all vocabulary cards with full details',
    description: 'Only admin can view complete vocabulary list with all fields',
  })
  @ApiOkResponse({ description: 'All vocabulary cards' })
  async getAllVocabulary() {
    return this.vocabularyService.getAllVocabulary();
  }
}

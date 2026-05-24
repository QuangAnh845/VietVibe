/**
 * API DTO (Data Transfer Object) for enhanced search & filtering
 * Backend side
 */

import { IsString, IsOptional, IsArray, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Search Query DTO
 */
export class SearchQueryDto {
  @ApiProperty({ example: 'restaurant', description: 'Search query string' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ example: 'N4', description: 'Filter by level (N5, N4, N3, N2, N1)' })
  @IsOptional()
  @IsIn(['N5', 'N4', 'N3', 'N2', 'N1'])
  level?: string;

  @ApiProperty({
    example: 'easy',
    description: 'Filter by difficulty (easy, medium, hard)',
  })
  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiProperty({
    example: false,
    description: 'Show only items with progress',
  })
  @IsOptional()
  @IsBoolean()
  hasProgress?: boolean;

  @ApiProperty({
    example: false,
    description: 'Show only completed items',
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiProperty({
    example: ['place_id_1', 'place_id_2'],
    description: 'Filter by place IDs',
  })
  @IsOptional()
  @IsArray()
  placeIds?: string[];

  @ApiProperty({
    example: 'relevance',
    description: 'Sort by (relevance, newest, popular)',
  })
  @IsOptional()
  @IsIn(['relevance', 'newest', 'popular'])
  sortBy?: 'relevance' | 'newest' | 'popular';

  @ApiProperty({ example: 0, description: 'Pagination offset' })
  @IsOptional()
  offset?: number;

  @ApiProperty({ example: 20, description: 'Pagination limit' })
  @IsOptional()
  limit?: number;
}

/**
 * Response DTO for search results
 */
export class SearchResultDto {
  id: string;
  type: 'place' | 'situation' | 'learning_unit';
  title: string;
  subtitle?: string;
  description?: string;
  placeId?: string;
  situationId?: string;
  level?: string;
  difficulty?: string;
  progress?: number;
  completed?: boolean;
  avatarUrl?: string;
  matchScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Paginated search results
 */
export class SearchResultsResponseDto {
  @ApiProperty({ type: [SearchResultDto] })
  data: SearchResultDto[];

  @ApiProperty({ example: 50, description: 'Total count of matching results' })
  total: number;

  @ApiProperty({ example: 0, description: 'Pagination offset' })
  offset: number;

  @ApiProperty({ example: 20, description: 'Pagination limit' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Total pages' })
  pages: number;
}

/**
 * Place with full hierarchy DTO
 * For optimized API call returning all related data
 */
export class LearningUnitFullDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  titleVi: string;

  @ApiProperty()
  titleJa: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  levelId: string;

  @ApiProperty()
  level: string; // e.g., 'N4'

  @ApiProperty()
  difficulty: string; // 'easy' | 'medium' | 'hard'

  @ApiProperty()
  audioUrl?: string;

  @ApiProperty()
  transcriptUrl?: string;
}

/**
 * Situation with learning units
 */
export class SituationFullDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  titleVi: string;

  @ApiProperty()
  titleJa: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ type: [LearningUnitFullDto] })
  learningUnits: LearningUnitFullDto[];
}

/**
 * Place with full hierarchy
 */
export class PlaceFullDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nameVi: string;

  @ApiProperty()
  nameJa: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty({ type: [SituationFullDto] })
  situations: SituationFullDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/**
 * Response for /listening/places/full endpoint
 */
export class PlacesFullResponseDto {
  @ApiProperty({ type: [PlaceFullDto] })
  places: PlaceFullDto[];

  @ApiProperty()
  totalPlaces: number;

  @ApiProperty()
  totalSituations: number;

  @ApiProperty()
  totalLearningUnits: number;
}

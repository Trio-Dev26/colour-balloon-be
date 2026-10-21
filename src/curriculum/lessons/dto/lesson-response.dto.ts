import { ApiProperty } from '@nestjs/swagger';
import { ModuleStatus } from '../../../../generated/prisma/enums';
import { TaxonomyResponseDto } from '../../../catalog/dto/taxonomy-response.dto';

const jsonObject = { type: 'object', additionalProperties: true } as const;

/** The module of a lesson, with the chips shown on the lesson page. */
export class LessonModuleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'M001' })
  code: string;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty({
    enum: ModuleStatus,
    description: 'Move, reorder and delete are Draft-only (D18, D28)',
  })
  status: ModuleStatus;

  @ApiProperty({ type: TaxonomyResponseDto })
  level: TaxonomyResponseDto;

  @ApiProperty({ type: TaxonomyResponseDto })
  category: TaxonomyResponseDto;
}

export class LessonUnitDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'U001' })
  code: string;

  @ApiProperty({
    example: 1,
    description: 'Position of the unit in its module',
  })
  sequence: number;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty({ type: LessonModuleDto })
  module: LessonModuleDto;
}

/** Files per audience (PRD FR-FILE-001): STUDENT_* and TEACHER_* groups. */
export class LessonFileCountsDto {
  @ApiProperty({ example: 3 })
  student: number;

  @ApiProperty({ example: 1 })
  teacher: number;
}

export class LessonResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'L001',
    description: 'System-generated; never changes',
  })
  code: string;

  @ApiProperty({
    example: 1,
    description: 'Position in the unit (unlock order)',
  })
  sequence: number;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty(jsonObject)
  descriptionEn: object;

  @ApiProperty(jsonObject)
  descriptionMy: object;

  @ApiProperty({ format: 'uuid' })
  unitId: string;

  @ApiProperty({ type: LessonUnitDto })
  unit: LessonUnitDto;

  @ApiProperty({ type: LessonFileCountsDto })
  fileCounts: LessonFileCountsDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LessonListResponseDto {
  @ApiProperty({ type: [LessonResponseDto] })
  items: LessonResponseDto[];

  @ApiProperty({ description: 'Total matches across all pages' })
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

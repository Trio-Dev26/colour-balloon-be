import { ApiProperty } from '@nestjs/swagger';
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

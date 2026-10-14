import { ApiProperty } from '@nestjs/swagger';
import { ModuleStatus } from '../../../../generated/prisma/enums';
import { TaxonomyResponseDto } from '../../../catalog/dto/taxonomy-response.dto';

const jsonObject = { type: 'object', additionalProperties: true } as const;

export class ModuleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'M001',
    description: 'System-generated; never changes',
  })
  code: string;

  @ApiProperty({ enum: ModuleStatus, enumName: 'ModuleStatus' })
  status: ModuleStatus;

  @ApiProperty({ example: 3, description: 'Number of units in the module' })
  unitCount: number;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty(jsonObject)
  descriptionEn: object;

  @ApiProperty(jsonObject)
  descriptionMy: object;

  @ApiProperty()
  learningGoalEn: string;

  @ApiProperty()
  learningGoalMy: string;

  @ApiProperty(jsonObject)
  learningOutcomeEn: object;

  @ApiProperty(jsonObject)
  learningOutcomeMy: object;

  @ApiProperty({ type: TaxonomyResponseDto })
  level: TaxonomyResponseDto;

  @ApiProperty({ type: TaxonomyResponseDto })
  category: TaxonomyResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ModuleListResponseDto {
  @ApiProperty({ type: [ModuleResponseDto] })
  items: ModuleResponseDto[];

  @ApiProperty({ description: 'Total matches across all pages' })
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

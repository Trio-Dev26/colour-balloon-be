import { ApiProperty } from '@nestjs/swagger';
import { ModuleStatus } from '../../../../generated/prisma/enums';

const jsonObject = { type: 'object', additionalProperties: true } as const;

/** The module a unit belongs to, as shown in unit lists. */
export class UnitModuleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'M001' })
  code: string;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty({ enum: ModuleStatus, enumName: 'ModuleStatus' })
  status: ModuleStatus;
}

export class UnitResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'U001',
    description: 'System-generated; never changes',
  })
  code: string;

  @ApiProperty({
    example: 1,
    description: 'Position in the module (unlock order)',
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
  moduleId: string;

  @ApiProperty({ type: UnitModuleDto })
  module: UnitModuleDto;

  @ApiProperty({ example: 4, description: 'Number of live lessons' })
  lessonCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UnitListResponseDto {
  @ApiProperty({ type: [UnitResponseDto] })
  items: UnitResponseDto[];

  @ApiProperty({ description: 'Total matches across all pages' })
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

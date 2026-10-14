import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReorderUnitsDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  moduleId: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Every unit of the module, exactly once, in the new order (first = unlocks first)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  unitIds: string[];
}

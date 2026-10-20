import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { LessonFileGroup } from '../../../../generated/prisma/enums';

export class ReorderFilesDto {
  @ApiProperty({ enum: LessonFileGroup, enumName: 'LessonFileGroup' })
  @IsEnum(LessonFileGroup)
  group: LessonFileGroup;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Every file of the group, exactly once, in the new order',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  fileIds: string[];
}

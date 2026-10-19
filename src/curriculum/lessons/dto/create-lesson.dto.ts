import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { Prisma } from '../../../../generated/prisma/client';
import { RequiredText, RichText } from '../../shared/fields';

/** The lesson code (e.g. L001) and its position are set by the system. */
export class CreateLessonDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Unit the lesson belongs to (its module is implied)',
  })
  @IsUUID()
  unitId: string;

  @RequiredText(200, 'The letter Ka')
  titleEn: string;

  @RequiredText(200, 'က အက္ခရာ')
  titleMy: string;

  @RichText('English description (rich-text JSON document)')
  descriptionEn: Prisma.InputJsonObject;

  @RichText('Myanmar description (rich-text JSON document)')
  descriptionMy: Prisma.InputJsonObject;
}

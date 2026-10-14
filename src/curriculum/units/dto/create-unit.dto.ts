import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { Prisma } from '../../../../generated/prisma/client';
import { RequiredText, RichText } from '../../shared/fields';

/** The unit code (e.g. U001) and its position are set by the system. */
export class CreateUnitDto {
  @ApiProperty({ format: 'uuid', description: 'Module the unit belongs to' })
  @IsUUID()
  moduleId: string;

  @RequiredText(200, 'Consonants')
  titleEn: string;

  @RequiredText(200, 'ဗျည်းများ')
  titleMy: string;

  @RichText('English description (rich-text JSON document)')
  descriptionEn: Prisma.InputJsonObject;

  @RichText('Myanmar description (rich-text JSON document)')
  descriptionMy: Prisma.InputJsonObject;
}

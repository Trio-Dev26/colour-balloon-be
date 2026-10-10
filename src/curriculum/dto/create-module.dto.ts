import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import type { Prisma } from '../../../generated/prisma/client';
import { Trim } from '../../common/decorators/trim.decorator';

const RequiredText = (maxLength: number, example: string) =>
  applyDecorators(
    ApiProperty({ example, maxLength }),
    Trim(),
    IsString(),
    IsNotEmpty(),
    MaxLength(maxLength),
  );

const RichText = (description: string) =>
  applyDecorators(
    ApiProperty({
      type: 'object',
      additionalProperties: true,
      description,
      example: { type: 'doc', content: [] },
    }),
    IsObject(),
  );

export class CreateModuleDto {
  @ApiProperty({
    example: 'M01',
    description:
      'Module number. The stored code is LEVEL-CATEGORY-<code> (e.g. BEGINNER-READING-M01); the prefix follows the module level and category automatically.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9_]{1,10}$/, {
    message: 'code must be 1-10 letters, numbers or underscores (e.g. M01)',
  })
  code: string;

  @RequiredText(200, 'Myanmar Reading Basics')
  titleEn: string;

  @RequiredText(200, 'မြန်မာစာဖတ်ခြင်း အခြေခံ')
  titleMy: string;

  @RichText('English description (rich-text JSON document)')
  descriptionEn: Prisma.InputJsonObject;

  @RichText('Myanmar description (rich-text JSON document)')
  descriptionMy: Prisma.InputJsonObject;

  @RequiredText(1000, 'Recognise and read basic consonants and vowels.')
  learningGoalEn: string;

  @RequiredText(1000, 'အခြေခံ ဗျည်းနှင့် သရများကို ဖတ်တတ်ခြင်း')
  learningGoalMy: string;

  @RichText('English learning outcome (rich-text JSON document)')
  learningOutcomeEn: Prisma.InputJsonObject;

  @RichText('Myanmar learning outcome (rich-text JSON document)')
  learningOutcomeMy: Prisma.InputJsonObject;

  @ApiProperty({ format: 'uuid', description: 'Id from GET /levels' })
  @IsUUID()
  levelId: string;

  @ApiProperty({ format: 'uuid', description: 'Id from GET /categories' })
  @IsUUID()
  categoryId: string;
}

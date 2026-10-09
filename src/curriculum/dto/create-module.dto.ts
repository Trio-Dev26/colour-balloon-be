import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
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

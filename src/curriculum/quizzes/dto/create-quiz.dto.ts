import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { Prisma } from '../../../../generated/prisma/client';
import { QuizType } from '../../../../generated/prisma/enums';
import { RequiredText } from '../../shared/fields';
import { MAX_QUIZ_ATTEMPTS } from '../quiz.constants';

const optionalRichText = {
  type: 'object',
  additionalProperties: true,
  nullable: true,
  description:
    'Optional rich-text (TipTap JSON) shown before the quiz; null clears it',
} as const;

/**
 * The code (e.g. QZ001) is set by the system. A unit quiz needs `unitId` (its
 * module is implied); a Chapter End Test needs `moduleId` and no unit (D16).
 */
export class CreateQuizDto {
  @ApiProperty({ enum: QuizType, enumName: 'QuizType' })
  @IsEnum(QuizType)
  type: QuizType;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required for CHAPTER_END_TEST; optional check for UNIT_QUIZ',
  })
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Required for UNIT_QUIZ; never changes (D28). Leave out for CHAPTER_END_TEST',
  })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiPropertyOptional({
    default: true,
    description:
      'Unit quiz: Required ones must be passed to open the next unit (D5). The Chapter End Test is always required',
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({
    example: 70,
    minimum: 1,
    maximum: 100,
    description:
      'Pass when the score is at least this % of the total points (D21)',
  })
  @IsInt()
  @Min(1)
  @Max(100)
  passPercent: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 3,
    minimum: 1,
    maximum: MAX_QUIZ_ATTEMPTS,
    description:
      'Attempts before the 24-hour lock; null = unlimited. Left out on create: unit quiz unlimited, Chapter End Test 3 (D24)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUIZ_ATTEMPTS)
  maxAttempts?: number | null;

  @RequiredText(200, 'Consonants check')
  titleEn: string;

  @RequiredText(200, 'ဗျည်း စစ်ဆေးမှု')
  titleMy: string;

  @ApiPropertyOptional(optionalRichText)
  @IsOptional()
  @IsObject()
  descriptionEn?: Prisma.InputJsonObject | null;

  @ApiPropertyOptional(optionalRichText)
  @IsOptional()
  @IsObject()
  descriptionMy?: Prisma.InputJsonObject | null;
}

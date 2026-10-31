import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import type { Prisma } from '../../../../generated/prisma/client';
import { QuestionType } from '../../../../generated/prisma/enums';
import { RichText } from '../../shared/fields';
import { QUESTION_LIMITS } from '../question.constants';

const ANSWERS_SHAPES = `Shape depends on \`type\` (D22, D23):
- MULTIPLE_CHOICE: { options: [{ text?, mediaId?, correct }] }, 2–20 options, exactly one correct
- TRUE_FALSE: { correct: true | false }
- FILL_BLANK: { blanks: [{ accepted: ["ကာ"] }] }, one entry per ___ in the prompt, 1–20 accepted answers each
- MATCHING: { pairs: [{ left: { text?, mediaId? }, right: { text?, mediaId? } }] }, 2–20 pairs
- SEQUENCE: { steps: [{ text?, mediaId? }] }, 2–20 steps in the correct order
Every option, side and step needs text and/or an image (mediaId from POST /admin/questions/media).
Options, pairs and steps get an \`id\` on save; send it back when editing to keep it.`;

/** The code (e.g. QN001) is set by the system. */
export class CreateQuestionDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Unit the question belongs to; it never changes (D28)',
  })
  @IsUUID()
  unitId: string;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @RichText(
    'Myanmar prompt (TipTap JSON), required: questions are Myanmar-first (Q24). FILL_BLANK: type ___ for each blank',
  )
  promptMy: Prisma.InputJsonObject;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'Optional English translation of the prompt; null or no text clears it. Not allowed for FILL_BLANK (its blanks are Myanmar words)',
  })
  @IsOptional()
  @IsObject()
  promptEn?: Prisma.InputJsonObject | null;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: `Images shown with the prompt, ids from POST /admin/questions/media (max ${QUESTION_LIMITS.MAX_PROMPT_IMAGES})`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(QUESTION_LIMITS.MAX_PROMPT_IMAGES)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  promptMediaIds?: string[];

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: ANSWERS_SHAPES,
    example: {
      options: [
        { text: 'က', correct: true },
        { text: 'ခ', correct: false },
        { text: 'ဂ', correct: false },
      ],
    },
  })
  @IsObject()
  answers: Record<string, unknown>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description: 'Optional Myanmar explanation; null clears it',
  })
  @IsOptional()
  @IsObject()
  explanationMy?: Prisma.InputJsonObject | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    description:
      'Optional English explanation; null clears it. Not allowed for FILL_BLANK',
  })
  @IsOptional()
  @IsObject()
  explanationEn?: Prisma.InputJsonObject | null;

  @ApiProperty({ example: 1, minimum: 1, maximum: QUESTION_LIMITS.MAX_POINTS })
  @IsInt()
  @Min(1)
  @Max(QUESTION_LIMITS.MAX_POINTS)
  points: number;
}

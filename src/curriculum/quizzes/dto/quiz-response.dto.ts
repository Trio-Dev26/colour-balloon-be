import { ApiProperty } from '@nestjs/swagger';
import {
  ModuleStatus,
  QuestionType,
  QuizType,
} from '../../../../generated/prisma/enums';

const optionalJson = {
  type: 'object',
  additionalProperties: true,
  nullable: true,
} as const;

export class QuizModuleDto {
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

export class QuizUnitDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'U001' })
  code: string;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;
}

export class QuizQuestionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'QN001' })
  code: string;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type: QuestionType;

  @ApiProperty({ example: 'Which letter is “ka”?' })
  promptText: string;

  @ApiProperty({ example: 1 })
  points: number;

  @ApiProperty({ example: 1, description: 'Position in the quiz' })
  sequence: number;
}

export class QuizResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'QZ001',
    description: 'System-generated; never changes',
  })
  code: string;

  @ApiProperty({ enum: QuizType, enumName: 'QuizType' })
  type: QuizType;

  @ApiProperty({ format: 'uuid' })
  moduleId: string;

  @ApiProperty({ type: QuizModuleDto })
  module: QuizModuleDto;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  unitId: string | null;

  @ApiProperty({
    type: QuizUnitDto,
    nullable: true,
    description: 'Null for the Chapter End Test',
  })
  unit: QuizUnitDto | null;

  @ApiProperty()
  required: boolean;

  @ApiProperty({ example: 70 })
  passPercent: number;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty(optionalJson)
  descriptionEn: object | null;

  @ApiProperty(optionalJson)
  descriptionMy: object | null;

  @ApiProperty({ example: 3 })
  questionCount: number;

  @ApiProperty({ example: 6, description: 'Sum of the question points (D21)' })
  totalPoints: number;

  @ApiProperty({ type: [QuizQuestionDto] })
  questions: QuizQuestionDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class QuizListResponseDto {
  @ApiProperty({ type: [QuizResponseDto] })
  items: QuizResponseDto[];

  @ApiProperty({ description: 'Total matches across all pages' })
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModuleStatus, QuestionType } from '../../../../generated/prisma/enums';

const jsonObject = { type: 'object', additionalProperties: true } as const;

export class QuestionModuleDto {
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

export class QuestionUnitDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'U001' })
  code: string;

  @ApiProperty()
  titleEn: string;

  @ApiProperty()
  titleMy: string;

  @ApiProperty({ type: QuestionModuleDto })
  module: QuestionModuleDto;
}

export class QuizRefDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'QZ001' })
  code: string;
}

export class QuestionMediaDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'image/png' })
  contentType: string;

  @ApiProperty({ description: 'Signed URL, valid for 1 hour' })
  url: string;
}

export class UploadedMediaDto extends QuestionMediaDto {
  @ApiProperty({ example: 48213 })
  sizeBytes: number;
}

export class QuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    example: 'QN001',
    description: 'System-generated; never changes',
  })
  code: string;

  @ApiProperty({ enum: QuestionType, enumName: 'QuestionType' })
  type: QuestionType;

  @ApiProperty(jsonObject)
  prompt: object;

  @ApiProperty({
    example: 'Which letter is “ka”?',
    description: 'Plain text of the prompt',
  })
  promptText: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  promptMediaIds: string[];

  @ApiProperty({
    ...jsonObject,
    description: 'See answers on CreateQuestionDto',
  })
  answers: object;

  @ApiProperty({ ...jsonObject, nullable: true })
  explanation: object | null;

  @ApiProperty({ example: 1 })
  points: number;

  @ApiProperty({ format: 'uuid' })
  unitId: string;

  @ApiProperty({ type: QuestionUnitDto })
  unit: QuestionUnitDto;

  @ApiProperty({
    type: [QuizRefDto],
    description:
      'Live quizzes using it; while not empty it can’t be deleted (D18)',
  })
  quizzes: QuizRefDto[];

  @ApiPropertyOptional({
    type: [QuestionMediaDto],
    description: 'Every image the prompt and answers use, by id (detail only)',
  })
  media?: QuestionMediaDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class QuestionListResponseDto {
  @ApiProperty({ type: [QuestionResponseDto] })
  items: QuestionResponseDto[];

  @ApiProperty({ description: 'Total matches across all pages' })
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

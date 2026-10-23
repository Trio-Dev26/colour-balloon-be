import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { MAX_QUIZ_QUESTIONS } from '../quiz.constants';

/** The whole ordered question list; adding, removing and reordering all save it. */
export class SetQuizQuestionsDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Every question of the quiz, in order, each once. Unit quiz: from its unit. Chapter End Test: from any unit of the module',
  })
  @IsArray()
  @ArrayMaxSize(MAX_QUIZ_QUESTIONS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  questionIds: string[];
}

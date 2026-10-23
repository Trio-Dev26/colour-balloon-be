import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

/**
 * Any field except the unit (D28: a question's unit never changes; wrong unit
 * means delete and create again). A new type needs answers of that type.
 */
export class UpdateQuestionDto extends PartialType(
  OmitType(CreateQuestionDto, ['unitId'] as const),
) {}

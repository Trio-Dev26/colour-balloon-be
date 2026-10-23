import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto';

/** Type, module and unit never change (D28: wrong unit means delete and create again). */
export class UpdateQuizDto extends PartialType(
  OmitType(CreateQuizDto, ['type', 'moduleId', 'unitId'] as const),
) {}

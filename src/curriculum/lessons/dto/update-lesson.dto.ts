import { PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';

/**
 * Any field of a lesson. A new unitId (of the same module) moves the lesson to
 * the end of that unit; its code stays the same (Decision Log D13).
 */
export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

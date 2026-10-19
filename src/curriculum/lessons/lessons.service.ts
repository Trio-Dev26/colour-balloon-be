import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError } from '../../prisma/prisma-error.util';
import { UnitsService } from '../units/units.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons-query.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LESSON_ERRORS } from './lesson.constants';
import { LessonsRepository } from './lessons.repository';

@Injectable()
export class LessonsService {
  constructor(
    private readonly lessonsRepository: LessonsRepository,
    private readonly unitsService: UnitsService,
  ) {}

  async findAll({ page, limit, ...filter }: ListLessonsQueryDto) {
    const { items, total } = await this.lessonsRepository.findPage(
      filter,
      (page - 1) * limit,
      limit,
    );
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const found = await this.lessonsRepository.findById(id);
    if (!found) throw this.notFound(id);
    return found;
  }

  /** A new lesson goes to the end of its unit, with the next free code (e.g. L003). */
  async create(dto: CreateLessonDto) {
    // A deleted unit still exists in the table, so the foreign key alone doesn't reject it.
    await this.requireUnit(dto.unitId);
    return this.lessonsRepository.create(dto);
  }

  /** A new unitId (same module only) moves the lesson to the end of that unit. */
  async update(id: string, dto: UpdateLessonDto) {
    if (dto.unitId) {
      const [lesson, target] = await Promise.all([
        this.findOne(id),
        this.requireUnit(dto.unitId),
      ]);
      if (target.moduleId !== lesson.unit.module.id) {
        throw new BadRequestException(LESSON_ERRORS.MOVE_ACROSS_MODULES);
      }
    }
    try {
      return await this.lessonsRepository.update(id, dto);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  /**
   * Applies a drag-and-drop order. The list must contain every lesson of the
   * unit exactly once, so a stale screen cannot silently drop a lesson.
   */
  async reorder({ unitId, lessonIds }: ReorderLessonsDto) {
    await this.requireUnit(unitId);
    const current = await this.lessonsRepository.findByUnit(unitId);
    const currentIds = new Set(current.map((lesson) => lesson.id));
    const isSameSet =
      lessonIds.length === currentIds.size &&
      lessonIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new BadRequestException(LESSON_ERRORS.REORDER_MISMATCH);
    }

    await this.lessonsRepository.reorder(unitId, lessonIds);
    return this.lessonsRepository.findByUnit(unitId);
  }

  async remove(id: string): Promise<void> {
    // TODO(D18): once progress is tracked, reject deleting a lesson a student has
    // started inside a Published/Unpublished module.
    try {
      await this.lessonsRepository.softDelete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  private async requireUnit(unitId: string) {
    const unit = await this.unitsService.findById(unitId);
    if (!unit) throw new BadRequestException(LESSON_ERRORS.UNIT_NOT_FOUND);
    return unit;
  }

  private notFound(id: string) {
    return new NotFoundException(LESSON_ERRORS.NOT_FOUND(id));
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleStatus } from '../../../generated/prisma/enums';
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

  /**
   * A new unitId moves the lesson to the end of that unit, possibly in another
   * module, only while both modules are Draft (Decision Log D28).
   */
  async update(id: string, dto: UpdateLessonDto) {
    const current = await this.findOne(id);
    if (dto.unitId && dto.unitId !== current.unitId) {
      const target = await this.requireUnit(dto.unitId);
      if (
        current.unit.module.status !== ModuleStatus.DRAFT ||
        target.module.status !== ModuleStatus.DRAFT
      ) {
        throw new ConflictException(LESSON_ERRORS.MOVE_NEEDS_DRAFT);
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
   * Draft modules only; a published module's order is locked (Decision Log D28).
   */
  async reorder({ unitId, lessonIds }: ReorderLessonsDto) {
    const unit = await this.requireUnit(unitId);
    if (unit.module.status !== ModuleStatus.DRAFT) {
      throw new ConflictException(LESSON_ERRORS.REORDER_NEEDS_DRAFT);
    }
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

  /**
   * Draft module: always allowed (D18). Published/Unpublished: D18 allows it only
   * when no student has started the lesson; until progress is tracked it is refused.
   */
  async remove(id: string): Promise<void> {
    const lesson = await this.findOne(id);
    // TODO(D18): once progress is tracked, allow it when no student has started the lesson.
    if (lesson.unit.module.status !== ModuleStatus.DRAFT) {
      throw new ConflictException(LESSON_ERRORS.DELETE_NEEDS_DRAFT);
    }
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

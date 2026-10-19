import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { TAXONOMY_SELECT } from '../../catalog/taxonomy.select';
import { nextCodeNumber } from '../../prisma/code-sequence';
import { PrismaService } from '../../prisma/prisma.service';
import { CODE_PREFIX, formatCode } from '../shared/codes';
import { NOT_DELETED } from '../shared/soft-delete';

export interface LessonFilter {
  moduleId?: string;
  unitId?: string;
  /** Case-insensitive match on the code, English title or Myanmar title. */
  search?: string;
}

/** Unit and module with the level/category chips shown on the lesson page. */
const LESSON_INCLUDE = {
  unit: {
    select: {
      id: true,
      code: true,
      sequence: true,
      titleEn: true,
      titleMy: true,
      module: {
        select: {
          id: true,
          code: true,
          titleEn: true,
          titleMy: true,
          status: true,
          level: { select: TAXONOMY_SELECT },
          category: { select: TAXONOMY_SELECT },
        },
      },
    },
  },
} as const satisfies Prisma.LessonInclude;

/** Module, then unit, then the position inside the unit (the learner's unlock order). */
const LESSON_ORDER: Prisma.LessonOrderByWithRelationInput[] = [
  { unit: { module: { code: 'asc' } } },
  { unit: { sequence: 'asc' } },
  { sequence: 'asc' },
  { id: 'asc' },
];

/**
 * Position after the unit's last live lesson. Locks the unit row first, so
 * concurrent creates and moves into the same unit get distinct positions.
 */
async function nextSequence(tx: Prisma.TransactionClient, unitId: string) {
  await tx.$queryRaw`SELECT 1 FROM units WHERE id = ${unitId}::uuid FOR UPDATE`;
  const { _max } = await tx.lesson.aggregate({
    where: { unitId, ...NOT_DELETED },
    _max: { sequence: true },
  });
  return (_max.sequence ?? 0) + 1;
}

/** A lesson left position `sequence`: the lessons after it move up one, so the order stays 1..n. */
async function closeGap(
  tx: Prisma.TransactionClient,
  unitId: string,
  sequence: number,
) {
  await tx.lesson.updateMany({
    where: { unitId, sequence: { gt: sequence }, ...NOT_DELETED },
    data: { sequence: { decrement: 1 } },
  });
}

/** All database access for lessons. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class LessonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: LessonFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        include: LESSON_INCLUDE,
        orderBy: LESSON_ORDER,
        skip,
        take,
      }),
      this.prisma.lesson.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id, ...NOT_DELETED },
      include: LESSON_INCLUDE,
    });
  }

  findByUnit(unitId: string) {
    return this.prisma.lesson.findMany({
      where: { unitId, ...NOT_DELETED },
      include: LESSON_INCLUDE,
      orderBy: LESSON_ORDER,
    });
  }

  /** Inserts the lesson at the end of its unit with the next free system-wide code (e.g. L012). */
  create(data: Omit<Prisma.LessonUncheckedCreateInput, 'code' | 'sequence'>) {
    const prefix = CODE_PREFIX.lesson;
    return this.prisma.$transaction(async (tx) => {
      const code = formatCode(prefix, await nextCodeNumber(tx, prefix));
      const sequence = await nextSequence(tx, data.unitId);
      return tx.lesson.create({
        data: { ...data, code, sequence },
        include: LESSON_INCLUDE,
      });
    });
  }

  /**
   * Updates the lesson. A different unitId moves it to the end of that unit
   * and moves the lessons after it in the old unit up one place.
   * Throws P2025 when the lesson doesn't exist or is deleted.
   */
  update(
    id: string,
    data: Prisma.LessonUncheckedUpdateInput & { unitId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.lesson.findUniqueOrThrow({
        where: { id, ...NOT_DELETED },
      });
      const newUnitId =
        data.unitId !== current.unitId ? data.unitId : undefined;
      const sequence = newUnitId
        ? await nextSequence(tx, newUnitId)
        : undefined;
      const updated = await tx.lesson.update({
        where: { id },
        data: { ...data, sequence },
        include: LESSON_INCLUDE,
      });
      if (newUnitId) await closeGap(tx, current.unitId, current.sequence);
      return updated;
    });
  }

  /** Sets each lesson's position to its index in `lessonIds` (1-based), atomically. */
  async reorder(unitId: string, lessonIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      lessonIds.map((id, index) =>
        this.prisma.lesson.update({
          where: { id, unitId, ...NOT_DELETED },
          data: { sequence: index + 1 },
        }),
      ),
    );
  }

  /**
   * Hides the lesson (PRD FR-CUR-012) and moves the lessons after it up one place.
   * Throws P2025 when it doesn't exist or is already deleted.
   */
  async softDelete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { unitId, sequence } = await tx.lesson.update({
        where: { id, ...NOT_DELETED },
        data: { deletedAt: new Date() },
      });
      await closeGap(tx, unitId, sequence);
    });
  }

  private toWhere({
    moduleId,
    unitId,
    search,
  }: LessonFilter): Prisma.LessonWhereInput {
    return {
      ...NOT_DELETED,
      unitId,
      ...(moduleId && { unit: { moduleId } }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { titleEn: { contains: search, mode: 'insensitive' } },
          { titleMy: { contains: search } },
        ],
      }),
    };
  }
}

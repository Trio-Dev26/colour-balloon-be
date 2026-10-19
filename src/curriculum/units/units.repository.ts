import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { nextCodeNumber } from '../../prisma/code-sequence';
import { PrismaService } from '../../prisma/prisma.service';
import { CODE_PREFIX, formatCode } from '../shared/codes';
import { NOT_DELETED } from '../shared/soft-delete';

export interface UnitFilter {
  moduleId?: string;
  /** Case-insensitive match on the code, English title or Myanmar title. */
  search?: string;
}

const UNIT_INCLUDE = {
  module: { select: { id: true, code: true, titleEn: true, titleMy: true } },
  _count: { select: { lessons: { where: NOT_DELETED } } },
} as const satisfies Prisma.UnitInclude;

type UnitRow = Prisma.UnitGetPayload<{ include: typeof UNIT_INCLUDE }>;

/** Exposes the lesson count as a plain field instead of Prisma's `_count`. */
const toUnit = ({ _count, ...unit }: UnitRow) => ({
  ...unit,
  lessonCount: _count.lessons,
});

/** Module first, then the position inside it (the learner's unlock order). */
const UNIT_ORDER: Prisma.UnitOrderByWithRelationInput[] = [
  { module: { code: 'asc' } },
  { sequence: 'asc' },
  { id: 'asc' },
];

/** Position after the module's last live unit. */
async function nextSequence(tx: Prisma.TransactionClient, moduleId: string) {
  const { _max } = await tx.unit.aggregate({
    where: { moduleId, ...NOT_DELETED },
    _max: { sequence: true },
  });
  return (_max.sequence ?? 0) + 1;
}

/** A unit left position `sequence`: the units after it move up one, so the order stays 1..n. */
async function closeGap(
  tx: Prisma.TransactionClient,
  moduleId: string,
  sequence: number,
) {
  await tx.unit.updateMany({
    where: { moduleId, sequence: { gt: sequence }, ...NOT_DELETED },
    data: { sequence: { decrement: 1 } },
  });
}

/** All database access for units. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: UnitFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        include: UNIT_INCLUDE,
        orderBy: UNIT_ORDER,
        skip,
        take,
      }),
      this.prisma.unit.count({ where }),
    ]);
    return { items: rows.map(toUnit), total };
  }

  async findById(id: string) {
    const row = await this.prisma.unit.findUnique({
      where: { id, ...NOT_DELETED },
      include: UNIT_INCLUDE,
    });
    return row && toUnit(row);
  }

  async findByModule(moduleId: string) {
    const rows = await this.prisma.unit.findMany({
      where: { moduleId, ...NOT_DELETED },
      include: UNIT_INCLUDE,
      orderBy: UNIT_ORDER,
    });
    return rows.map(toUnit);
  }

  /**
   * Inserts the unit at the end of its module with the next free system-wide
   * code (e.g. U012). Taking the number first locks the unit counter row, so
   * concurrent inserts also get distinct positions.
   */
  create(data: Omit<Prisma.UnitUncheckedCreateInput, 'code' | 'sequence'>) {
    const prefix = CODE_PREFIX.unit;
    return this.prisma.$transaction(async (tx) => {
      const code = formatCode(prefix, await nextCodeNumber(tx, prefix));
      const sequence = await nextSequence(tx, data.moduleId);
      const row = await tx.unit.create({
        data: { ...data, code, sequence },
        include: UNIT_INCLUDE,
      });
      return toUnit(row);
    });
  }

  /**
   * Updates the unit. A different moduleId moves it to the end of that module
   * and moves the units after it in the old module up one place.
   * Throws P2025 when the unit doesn't exist or is deleted.
   */
  update(
    id: string,
    data: Prisma.UnitUncheckedUpdateInput & { moduleId?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.unit.findUniqueOrThrow({
        where: { id, ...NOT_DELETED },
      });
      const newModuleId =
        data.moduleId !== current.moduleId ? data.moduleId : undefined;
      // ponytail: two moves into the same module at the same instant could share a position; lock the module row if that ever happens.
      const sequence = newModuleId
        ? await nextSequence(tx, newModuleId)
        : undefined;
      const updated = await tx.unit.update({
        where: { id },
        data: { ...data, sequence },
        include: UNIT_INCLUDE,
      });
      if (newModuleId) await closeGap(tx, current.moduleId, current.sequence);
      return toUnit(updated);
    });
  }

  /** Sets each unit's position to its index in `unitIds` (1-based), atomically. */
  async reorder(moduleId: string, unitIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      unitIds.map((id, index) =>
        this.prisma.unit.update({
          where: { id, moduleId, ...NOT_DELETED },
          data: { sequence: index + 1 },
        }),
      ),
    );
  }

  /**
   * Hides the unit and its lessons (PRD FR-CUR-012) and moves the units after it
   * up one place, so the unlock order stays 1..n.
   * Throws P2025 when it doesn't exist or is already deleted.
   */
  async softDelete(id: string): Promise<void> {
    const deletedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const { moduleId, sequence } = await tx.unit.update({
        where: { id, ...NOT_DELETED },
        data: { deletedAt },
      });
      await tx.lesson.updateMany({
        where: { unitId: id, ...NOT_DELETED },
        data: { deletedAt },
      });
      await closeGap(tx, moduleId, sequence);
    });
  }

  private toWhere({ moduleId, search }: UnitFilter): Prisma.UnitWhereInput {
    return {
      ...NOT_DELETED,
      moduleId,
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

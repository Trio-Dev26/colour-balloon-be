import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { nextCodeNumber } from '../../prisma/code-sequence';
import { PrismaService } from '../../prisma/prisma.service';
import { CODE_PREFIX, formatCode } from '../shared/codes';

export interface UnitFilter {
  moduleId?: string;
  /** Case-insensitive match on the code, English title or Myanmar title. */
  search?: string;
}

const UNIT_INCLUDE = {
  module: { select: { id: true, code: true, titleEn: true, titleMy: true } },
} as const satisfies Prisma.UnitInclude;

/** Module first, then the position inside it (the learner's unlock order). */
const UNIT_ORDER: Prisma.UnitOrderByWithRelationInput[] = [
  { module: { code: 'asc' } },
  { sequence: 'asc' },
  { id: 'asc' },
];

/** All database access for units. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class UnitsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: UnitFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        include: UNIT_INCLUDE,
        orderBy: UNIT_ORDER,
        skip,
        take,
      }),
      this.prisma.unit.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.unit.findUnique({
      where: { id },
      include: UNIT_INCLUDE,
    });
  }

  findByModule(moduleId: string) {
    return this.prisma.unit.findMany({
      where: { moduleId },
      include: UNIT_INCLUDE,
      orderBy: UNIT_ORDER,
    });
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
      const { _max } = await tx.unit.aggregate({
        where: { moduleId: data.moduleId },
        _max: { sequence: true },
      });
      return tx.unit.create({
        data: { ...data, code, sequence: (_max.sequence ?? 0) + 1 },
        include: UNIT_INCLUDE,
      });
    });
  }

  update(id: string, data: Prisma.UnitUncheckedUpdateInput) {
    return this.prisma.unit.update({
      where: { id },
      data,
      include: UNIT_INCLUDE,
    });
  }

  /** Sets each unit's position to its index in `unitIds` (1-based), atomically. */
  async reorder(moduleId: string, unitIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      unitIds.map((id, index) =>
        this.prisma.unit.update({
          where: { id, moduleId },
          data: { sequence: index + 1 },
        }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.unit.delete({ where: { id } });
  }

  private toWhere({ moduleId, search }: UnitFilter): Prisma.UnitWhereInput {
    return {
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

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import type { ModuleStatus } from '../../../generated/prisma/enums';
import { TAXONOMY_SELECT } from '../../catalog/taxonomy.select';
import { nextCodeNumber } from '../../prisma/code-sequence';
import { PrismaService } from '../../prisma/prisma.service';
import { CODE_PREFIX, formatCode } from '../shared/codes';
import { NOT_DELETED } from '../shared/soft-delete';

export interface ModuleFilter {
  /** Case-insensitive match on the code, English title or Myanmar title. */
  search?: string;
  status?: ModuleStatus;
  levelId?: string;
  categoryId?: string;
}

const MODULE_INCLUDE = {
  level: { select: TAXONOMY_SELECT },
  category: { select: TAXONOMY_SELECT },
  _count: { select: { units: { where: NOT_DELETED } } },
} as const satisfies Prisma.ModuleInclude;

type ModuleRow = Prisma.ModuleGetPayload<{ include: typeof MODULE_INCLUDE }>;

/** Exposes the unit count as a plain field instead of Prisma's `_count`. */
const toModule = ({ _count, ...module }: ModuleRow) => ({
  ...module,
  unitCount: _count.units,
});

/** All database access for modules. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class ModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: ModuleFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.module.findMany({
        where,
        include: MODULE_INCLUDE,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.module.count({ where }),
    ]);
    return { items: rows.map(toModule), total };
  }

  async findById(id: string) {
    const row = await this.prisma.module.findUnique({
      where: { id, ...NOT_DELETED },
      include: MODULE_INCLUDE,
    });
    return row && toModule(row);
  }

  /** Inserts the module with the next free system-wide code (e.g. M004). */
  create(data: Omit<Prisma.ModuleUncheckedCreateInput, 'code'>) {
    const prefix = CODE_PREFIX.module;
    return this.prisma.$transaction(async (tx) => {
      const code = formatCode(prefix, await nextCodeNumber(tx, prefix));
      const row = await tx.module.create({
        data: { ...data, code },
        include: MODULE_INCLUDE,
      });
      return toModule(row);
    });
  }

  async update(id: string, data: Prisma.ModuleUncheckedUpdateInput) {
    const row = await this.prisma.module.update({
      where: { id, ...NOT_DELETED },
      data,
      include: MODULE_INCLUDE,
    });
    return toModule(row);
  }

  /** Live units that have at least one live lesson (D17 publish rule). */
  countUnitsWithLessons(moduleId: string) {
    return this.prisma.unit.count({
      where: { moduleId, ...NOT_DELETED, lessons: { some: NOT_DELETED } },
    });
  }

  /**
   * Hides the module, its units and their lessons (PRD FR-CUR-012, D18); nothing is erased.
   * Throws P2025 when the module doesn't exist or is already deleted.
   */
  async softDelete(id: string): Promise<void> {
    const deletedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.module.update({
        where: { id, ...NOT_DELETED },
        data: { deletedAt },
      }),
      this.prisma.unit.updateMany({
        where: { moduleId: id, ...NOT_DELETED },
        data: { deletedAt },
      }),
      this.prisma.lesson.updateMany({
        where: { unit: { moduleId: id }, ...NOT_DELETED },
        data: { deletedAt },
      }),
    ]);
  }

  private toWhere({
    search,
    status,
    levelId,
    categoryId,
  }: ModuleFilter): Prisma.ModuleWhereInput {
    return {
      ...NOT_DELETED,
      status,
      levelId,
      categoryId,
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

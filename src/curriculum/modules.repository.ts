import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { ModuleStatus } from '../../generated/prisma/enums';
import { TAXONOMY_SELECT } from '../catalog/taxonomy.select';
import { PrismaService } from '../prisma/prisma.service';

export interface ModuleFilter {
  /** Case-insensitive match on the code, English title or Myanmar title. */
  search?: string;
  status?: ModuleStatus;
  levelId?: string;
  categoryId?: string;
}

const WITH_TAXONOMY = {
  level: { select: TAXONOMY_SELECT },
  category: { select: TAXONOMY_SELECT },
} as const satisfies Prisma.ModuleInclude;

/** All database access for modules. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class ModulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: ModuleFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.module.findMany({
        where,
        include: WITH_TAXONOMY,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.module.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.module.findUnique({
      where: { id },
      include: WITH_TAXONOMY,
    });
  }

  create(data: Prisma.ModuleUncheckedCreateInput) {
    return this.prisma.module.create({ data, include: WITH_TAXONOMY });
  }

  update(id: string, data: Prisma.ModuleUncheckedUpdateInput) {
    return this.prisma.module.update({
      where: { id },
      data,
      include: WITH_TAXONOMY,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.module.delete({ where: { id } });
  }

  private toWhere({
    search,
    status,
    levelId,
    categoryId,
  }: ModuleFilter): Prisma.ModuleWhereInput {
    return {
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

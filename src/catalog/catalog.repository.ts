import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogEntry } from './catalog.data';
import { TAXONOMY_SELECT } from './taxonomy.select';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLevels() {
    return this.prisma.level.findMany({ select: TAXONOMY_SELECT });
  }

  findCategories() {
    return this.prisma.category.findMany({ select: TAXONOMY_SELECT });
  }

  findLevelById(id: string) {
    return this.prisma.level.findUnique({
      where: { id },
      select: TAXONOMY_SELECT,
    });
  }

  findCategoryById(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      select: TAXONOMY_SELECT,
    });
  }

  /** Creates missing entries and refreshes the titles of existing ones, atomically. */
  async upsertAll(
    levels: readonly CatalogEntry[],
    categories: readonly CatalogEntry[],
  ): Promise<void> {
    await this.prisma.$transaction([
      ...levels.map(({ code, ...titles }) =>
        this.prisma.level.upsert({
          where: { code },
          update: titles,
          create: { code, ...titles },
        }),
      ),
      ...categories.map(({ code, ...titles }) =>
        this.prisma.category.upsert({
          where: { code },
          update: titles,
          create: { code, ...titles },
        }),
      ),
    ]);
  }
}

import { Injectable } from '@nestjs/common';
import { CATEGORIES, CatalogEntry, LEVELS } from './catalog.data';
import { CatalogRepository } from './catalog.repository';

/** Orders rows like the seed list, since the tables have no display-order column. */
function byCatalogOrder(seed: readonly CatalogEntry[]) {
  const rank = new Map(seed.map(({ code }, index) => [code, index]));
  const rankOf = (code: string) => rank.get(code) ?? seed.length;
  return (a: { code: string }, b: { code: string }) =>
    rankOf(a.code) - rankOf(b.code);
}

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async findLevels() {
    const levels = await this.catalogRepository.findLevels();
    return levels.sort(byCatalogOrder(LEVELS));
  }

  async findCategories() {
    const categories = await this.catalogRepository.findCategories();
    return categories.sort(byCatalogOrder(CATEGORIES));
  }
}

import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CATEGORIES, LEVELS } from './catalog.data';
import { CatalogRepository } from './catalog.repository';

/** Keeps the fixed levels and categories in the database in sync with catalog.data.ts. */
@Injectable()
export class CatalogSeeder implements OnApplicationBootstrap {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  onApplicationBootstrap(): Promise<void> {
    return this.catalogRepository.upsertAll(LEVELS, CATEGORIES);
  }
}

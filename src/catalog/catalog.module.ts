import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogRepository } from './catalog.repository';
import { CatalogSeeder } from './catalog.seeder';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository, CatalogSeeder],
})
export class CatalogModule {}

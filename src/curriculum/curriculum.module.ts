import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ModulesController } from './modules.controller';
import { ModulesRepository } from './modules.repository';
import { ModulesService } from './modules.service';

@Module({
  imports: [CatalogModule],
  controllers: [ModulesController],
  providers: [ModulesService, ModulesRepository],
})
export class CurriculumModule {}

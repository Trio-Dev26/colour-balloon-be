import { Module } from '@nestjs/common';
import { ModulesController } from './modules/modules.controller';
import { ModulesRepository } from './modules/modules.repository';
import { ModulesService } from './modules/modules.service';
import { UnitsController } from './units/units.controller';
import { UnitsRepository } from './units/units.repository';
import { UnitsService } from './units/units.service';

@Module({
  controllers: [ModulesController, UnitsController],
  providers: [ModulesService, ModulesRepository, UnitsService, UnitsRepository],
})
export class CurriculumModule {}

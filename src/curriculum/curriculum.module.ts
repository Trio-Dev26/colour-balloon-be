import { Module } from '@nestjs/common';
import { LessonsController } from './lessons/lessons.controller';
import { LessonsRepository } from './lessons/lessons.repository';
import { LessonsService } from './lessons/lessons.service';
import { ModulesController } from './modules/modules.controller';
import { ModulesRepository } from './modules/modules.repository';
import { ModulesService } from './modules/modules.service';
import { UnitsController } from './units/units.controller';
import { UnitsRepository } from './units/units.repository';
import { UnitsService } from './units/units.service';

@Module({
  controllers: [ModulesController, UnitsController, LessonsController],
  providers: [
    ModulesService,
    ModulesRepository,
    UnitsService,
    UnitsRepository,
    LessonsService,
    LessonsRepository,
  ],
})
export class CurriculumModule {}

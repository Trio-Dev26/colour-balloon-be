import { Module } from '@nestjs/common';
import { LessonFilesController } from './lesson-files/lesson-files.controller';
import { LessonFilesRepository } from './lesson-files/lesson-files.repository';
import { LessonFilesService } from './lesson-files/lesson-files.service';
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
  controllers: [
    ModulesController,
    UnitsController,
    LessonsController,
    LessonFilesController,
  ],
  providers: [
    ModulesService,
    ModulesRepository,
    UnitsService,
    UnitsRepository,
    LessonsService,
    LessonsRepository,
    LessonFilesService,
    LessonFilesRepository,
  ],
})
export class CurriculumModule {}

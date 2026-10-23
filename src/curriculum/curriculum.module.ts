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
import { QuestionsController } from './questions/questions.controller';
import { QuestionsRepository } from './questions/questions.repository';
import { QuestionsService } from './questions/questions.service';
import { QuizzesController } from './quizzes/quizzes.controller';
import { QuizzesRepository } from './quizzes/quizzes.repository';
import { QuizzesService } from './quizzes/quizzes.service';
import { UnitsController } from './units/units.controller';
import { UnitsRepository } from './units/units.repository';
import { UnitsService } from './units/units.service';

@Module({
  controllers: [
    ModulesController,
    UnitsController,
    LessonsController,
    LessonFilesController,
    QuestionsController,
    QuizzesController,
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
    QuestionsService,
    QuestionsRepository,
    QuizzesService,
    QuizzesRepository,
  ],
})
export class CurriculumModule {}

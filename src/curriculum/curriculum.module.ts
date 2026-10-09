import { Module } from '@nestjs/common';
import { ModulesController } from './modules.controller';
import { ModulesRepository } from './modules.repository';
import { ModulesService } from './modules.service';

@Module({
  controllers: [ModulesController],
  providers: [ModulesService, ModulesRepository],
})
export class CurriculumModule {}

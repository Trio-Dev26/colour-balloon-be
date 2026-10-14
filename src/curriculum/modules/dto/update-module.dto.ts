import { PartialType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';

/**
 * Every field may be changed independently. The code never changes, even when
 * the level or category does (Decision Log D13). The status has its own route.
 */
export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

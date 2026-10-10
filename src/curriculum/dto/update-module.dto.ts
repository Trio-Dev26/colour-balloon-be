import { PartialType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';

/** Every field may be changed independently. The status has its own route. */
export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateModuleDto } from './create-module.dto';

/** Every field of a module may be changed independently. */
export class UpdateModuleDto extends PartialType(CreateModuleDto) {}

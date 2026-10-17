import { PartialType } from '@nestjs/swagger';
import { CreateUnitDto } from './create-unit.dto';

/**
 * Any field of a unit. A new moduleId moves the unit to the end of that module;
 * its code stays the same, since codes don't contain the module (Decision Log D13).
 */
export class UpdateUnitDto extends PartialType(CreateUnitDto) {}

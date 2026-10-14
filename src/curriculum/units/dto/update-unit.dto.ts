import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUnitDto } from './create-unit.dto';

/**
 * Titles and descriptions only. A unit cannot move to another module: its
 * code embeds the module code and never changes (Decision Log D13).
 */
export class UpdateUnitDto extends PartialType(
  OmitType(CreateUnitDto, ['moduleId'] as const),
) {}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError } from '../../prisma/prisma-error.util';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { ReorderUnitsDto } from './dto/reorder-units.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { ModulesService } from '../modules/modules.service';
import { UNIT_ERRORS } from './unit.constants';
import { UnitsRepository } from './units.repository';

@Injectable()
export class UnitsService {
  constructor(
    private readonly unitsRepository: UnitsRepository,
    private readonly modulesService: ModulesService,
  ) {}

  async findAll({ page, limit, ...filter }: ListUnitsQueryDto) {
    const { items, total } = await this.unitsRepository.findPage(
      filter,
      (page - 1) * limit,
      limit,
    );
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const found = await this.unitsRepository.findById(id);
    if (!found) throw this.notFound(id);
    return found;
  }

  /** A new unit goes to the end of its module, with the next free code (e.g. U003). */
  async create(dto: CreateUnitDto) {
    // A deleted module still exists in the table, so the foreign key alone doesn't reject it.
    await this.requireModule(dto.moduleId);
    try {
      return await this.unitsRepository.create(dto);
    } catch (error) {
      if (isPrismaError(error, 'P2003')) {
        throw new BadRequestException(UNIT_ERRORS.MODULE_NOT_FOUND);
      }
      throw error;
    }
  }

  /** A new moduleId moves the unit to the end of that module. */
  async update(id: string, dto: UpdateUnitDto) {
    if (dto.moduleId) await this.requireModule(dto.moduleId);
    try {
      return await this.unitsRepository.update(id, dto);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  /**
   * Applies a drag-and-drop order. The list must contain every unit of the
   * module exactly once, so a stale screen cannot silently drop a unit.
   */
  async reorder({ moduleId, unitIds }: ReorderUnitsDto) {
    await this.requireModule(moduleId);
    const current = await this.unitsRepository.findByModule(moduleId);
    const currentIds = new Set(current.map((unit) => unit.id));
    const isSameSet =
      unitIds.length === currentIds.size &&
      unitIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new BadRequestException(UNIT_ERRORS.REORDER_MISMATCH);
    }

    await this.unitsRepository.reorder(moduleId, unitIds);
    return this.unitsRepository.findByModule(moduleId);
  }

  async remove(id: string): Promise<void> {
    // TODO(D18): once progress is tracked, reject deleting a unit a student has
    // started inside a Published/Unpublished module.
    try {
      await this.unitsRepository.softDelete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  private async requireModule(moduleId: string) {
    const module = await this.modulesService.findById(moduleId);
    if (!module) throw new BadRequestException(UNIT_ERRORS.MODULE_NOT_FOUND);
    return module;
  }

  private notFound(id: string) {
    return new NotFoundException(UNIT_ERRORS.NOT_FOUND(id));
  }
}

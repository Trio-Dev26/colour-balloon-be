import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError } from '../../prisma/prisma-error.util';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListUnitsQueryDto } from './dto/list-units-query.dto';
import { ReorderUnitsDto } from './dto/reorder-units.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { ModuleStatus } from '../../../generated/prisma/enums';
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

  /**
   * A new moduleId moves the unit to the end of that module, only while both
   * modules are Draft (Decision Log D28).
   */
  async update(id: string, dto: UpdateUnitDto) {
    const current = await this.findOne(id);
    if (dto.moduleId && dto.moduleId !== current.moduleId) {
      const [from, to] = await Promise.all([
        this.requireModule(current.moduleId),
        this.requireModule(dto.moduleId),
      ]);
      if (
        from.status !== ModuleStatus.DRAFT ||
        to.status !== ModuleStatus.DRAFT
      ) {
        throw new ConflictException(UNIT_ERRORS.MOVE_NEEDS_DRAFT);
      }
    }
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
   * Draft modules only; a published module's order is locked (Decision Log D28).
   */
  async reorder({ moduleId, unitIds }: ReorderUnitsDto) {
    const module = await this.requireModule(moduleId);
    if (module.status !== ModuleStatus.DRAFT) {
      throw new ConflictException(UNIT_ERRORS.REORDER_NEEDS_DRAFT);
    }
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

  /**
   * Draft module: always allowed (D18). Published/Unpublished: D18 allows it only
   * when no student has started the unit; until progress is tracked it is refused.
   */
  async remove(id: string): Promise<void> {
    const unit = await this.findOne(id);
    // TODO(D18): once progress is tracked, allow it when no student has started the unit.
    if (unit.module.status !== ModuleStatus.DRAFT) {
      throw new ConflictException(UNIT_ERRORS.DELETE_NEEDS_DRAFT);
    }
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

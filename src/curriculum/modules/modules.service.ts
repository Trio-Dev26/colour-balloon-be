import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModuleStatus } from '../../../generated/prisma/enums';
import {
  isPrismaError,
  violatedConstraint,
} from '../../prisma/prisma-error.util';
import { CreateModuleDto } from './dto/create-module.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import {
  MODULE_ERRORS,
  MODULE_FOREIGN_KEY_VIOLATIONS,
  MODULE_UNIQUE_VIOLATIONS,
} from './module.constants';
import { ModulesRepository } from './modules.repository';

@Injectable()
export class ModulesService {
  constructor(private readonly modulesRepository: ModulesRepository) {}

  async findAll({ page, limit, ...filter }: ListModulesQueryDto) {
    const { items, total } = await this.modulesRepository.findPage(
      filter,
      (page - 1) * limit,
      limit,
    );
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const found = await this.modulesRepository.findById(id);
    if (!found) throw this.notFound(id);
    return found;
  }

  /** Returns null when the module does not exist (for callers that report it differently). */
  findById(id: string) {
    return this.modulesRepository.findById(id);
  }

  /** New modules start as DRAFT with the next free code, e.g. M004 (Decision Log D13). */
  async create(dto: CreateModuleDto) {
    try {
      return await this.modulesRepository.create(dto);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  /** The code never changes, even when the level or category does. */
  async update(id: string, dto: UpdateModuleDto) {
    try {
      return await this.modulesRepository.update(id, dto);
    } catch (error) {
      throw this.translateWriteError(error, id);
    }
  }

  /**
   * Status rules (Decision Log D17): publishing needs at least one unit,
   * Published and Unpublished toggle freely, and a module that has been
   * published can never go back to Draft.
   */
  async updateStatus(id: string, status: ModuleStatus) {
    const current = await this.findOne(id);
    if (current.status === status) return current;

    if (status === ModuleStatus.DRAFT) {
      throw new ConflictException(MODULE_ERRORS.CANNOT_RETURN_TO_DRAFT);
    }
    if (
      status === ModuleStatus.UNPUBLISHED &&
      current.status === ModuleStatus.DRAFT
    ) {
      throw new ConflictException(MODULE_ERRORS.CANNOT_UNPUBLISH_DRAFT);
    }
    // TODO(D17): also require at least one lesson once lessons exist.
    if (status === ModuleStatus.PUBLISHED && current.unitCount === 0) {
      throw new ConflictException(MODULE_ERRORS.PUBLISH_NEEDS_UNIT);
    }

    return this.modulesRepository.update(id, { status });
  }

  /**
   * Only Draft modules can be deleted, together with all their content
   * (Decision Log D18). Published content is unpublished instead. Deleting
   * hides the records; they stay in the database (PRD FR-CUR-012).
   */
  async remove(id: string): Promise<void> {
    const current = await this.findOne(id);
    if (current.status !== ModuleStatus.DRAFT) {
      throw new ConflictException(MODULE_ERRORS.CANNOT_DELETE_PUBLISHED);
    }

    try {
      await this.modulesRepository.softDelete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  private notFound(id: string) {
    return new NotFoundException(MODULE_ERRORS.NOT_FOUND(id));
  }

  /** Maps persistence failures on create/update to HTTP errors; anything else is left as-is. */
  private translateWriteError(error: unknown, id?: string): unknown {
    if (isPrismaError(error, 'P2002')) {
      const message = MODULE_UNIQUE_VIOLATIONS[violatedConstraint(error) ?? ''];
      return new ConflictException(message ?? MODULE_ERRORS.ALREADY_EXISTS);
    }
    if (isPrismaError(error, 'P2003')) {
      const message =
        MODULE_FOREIGN_KEY_VIOLATIONS[violatedConstraint(error) ?? ''];
      return new BadRequestException(
        message ?? MODULE_ERRORS.LEVEL_OR_CATEGORY_NOT_FOUND,
      );
    }
    if (id && isPrismaError(error, 'P2025')) return this.notFound(id);
    return error;
  }
}

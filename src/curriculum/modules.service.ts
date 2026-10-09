import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPrismaError, violatedConstraint } from '../prisma/prisma-error.util';
import { CreateModuleDto } from './dto/create-module.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesRepository } from './modules.repository';

// Constraint names follow Prisma's "<table>_<column>_key" / "_fkey" convention.
const UNIQUE_VIOLATIONS: Record<string, string> = {
  modules_title_en_key: 'A module with this English title already exists',
  modules_title_my_key: 'A module with this Myanmar title already exists',
};

const FOREIGN_KEY_VIOLATIONS: Record<string, string> = {
  modules_level_id_fkey: 'Level does not exist',
  modules_category_id_fkey: 'Category does not exist',
};

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

  async create(dto: CreateModuleDto) {
    try {
      return await this.modulesRepository.create(dto);
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  async update(id: string, dto: UpdateModuleDto) {
    try {
      return await this.modulesRepository.update(id, dto);
    } catch (error) {
      throw this.translateWriteError(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.modulesRepository.delete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      // A foreign key still points at this module (e.g. its units).
      if (isPrismaError(error, 'P2003')) {
        throw new ConflictException(
          'Module still has content and cannot be deleted',
        );
      }
      throw error;
    }
  }

  private notFound(id: string) {
    return new NotFoundException(`Module ${id} not found`);
  }

  /** Maps persistence failures on create/update to HTTP errors; anything else is left as-is. */
  private translateWriteError(error: unknown, id?: string): unknown {
    if (isPrismaError(error, 'P2002')) {
      const message = UNIQUE_VIOLATIONS[violatedConstraint(error) ?? ''];
      return new ConflictException(message ?? 'Module already exists');
    }
    if (isPrismaError(error, 'P2003')) {
      const message = FOREIGN_KEY_VIOLATIONS[violatedConstraint(error) ?? ''];
      return new BadRequestException(
        message ?? 'Level or category does not exist',
      );
    }
    if (id && isPrismaError(error, 'P2025')) return this.notFound(id);
    return error;
  }
}

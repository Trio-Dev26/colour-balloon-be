import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ModuleStatus } from '../../generated/prisma/enums';
import { CatalogService } from '../catalog/catalog.service';
import { isPrismaError, violatedConstraint } from '../prisma/prisma-error.util';
import { CreateModuleDto } from './dto/create-module.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesRepository } from './modules.repository';

// Constraint names follow Prisma's "<table>_<column>_key" / "_fkey" convention.
const UNIQUE_VIOLATIONS: Record<string, string> = {
  modules_code_key: 'A module with this code already exists',
  modules_title_en_key: 'A module with this English title already exists',
  modules_title_my_key: 'A module with this Myanmar title already exists',
};

const FOREIGN_KEY_VIOLATIONS: Record<string, string> = {
  modules_level_id_fkey: 'Level does not exist',
  modules_category_id_fkey: 'Category does not exist',
};

// Level and category codes never contain "-", so the last segment is always
// the admin-chosen suffix ("M01" in BEGINNER-READING-M01).
const buildCode = (level: string, category: string, suffix: string) =>
  `${level}-${category}-${suffix}`;
const suffixOf = (code: string) => code.slice(code.lastIndexOf('-') + 1);

@Injectable()
export class ModulesService {
  constructor(
    private readonly modulesRepository: ModulesRepository,
    private readonly catalogService: CatalogService,
  ) {}

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

  async create({ code, ...dto }: CreateModuleDto) {
    const { level, category } = await this.resolveTaxonomy(
      dto.levelId,
      dto.categoryId,
    );

    try {
      return await this.modulesRepository.create({
        ...dto,
        code: buildCode(level.code, category.code, code),
      });
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  /**
   * The code is LEVEL-CATEGORY-<suffix>, so it is rebuilt whenever the suffix,
   * the level or the category changes. Any other edit leaves it untouched.
   */
  async update(id: string, { code: suffix, ...fields }: UpdateModuleDto) {
    let code: string | undefined;
    if (suffix || fields.levelId || fields.categoryId) {
      const current = await this.findOne(id);
      const { level, category } = await this.resolveTaxonomy(
        fields.levelId ?? current.levelId,
        fields.categoryId ?? current.categoryId,
      );
      code = buildCode(
        level.code,
        category.code,
        suffix ?? suffixOf(current.code),
      );
    }

    try {
      return await this.modulesRepository.update(id, { ...fields, code });
    } catch (error) {
      throw this.translateWriteError(error, id);
    }
  }

  async updateStatus(id: string, status: ModuleStatus) {
    try {
      return await this.modulesRepository.update(id, { status });
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

  /** Loads the level and category a module belongs to, or rejects the request. */
  private async resolveTaxonomy(levelId: string, categoryId: string) {
    const [level, category] = await Promise.all([
      this.catalogService.findLevelById(levelId),
      this.catalogService.findCategoryById(categoryId),
    ]);
    if (!level) throw new BadRequestException('Level does not exist');
    if (!category) throw new BadRequestException('Category does not exist');
    return { level, category };
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

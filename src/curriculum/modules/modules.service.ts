import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ModuleStatus } from '../../../generated/prisma/enums';
import {
  isPrismaError,
  violatedConstraint,
} from '../../prisma/prisma-error.util';
import { StorageService } from '../../storage/storage.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { ListModulesQueryDto } from './dto/list-modules-query.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import {
  MODULE_ERRORS,
  MODULE_FOREIGN_KEY_VIOLATIONS,
  MODULE_THUMBNAIL,
  MODULE_UNIQUE_VIOLATIONS,
} from './module.constants';
import { ModulesRepository } from './modules.repository';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    private readonly modulesRepository: ModulesRepository,
    private readonly storage: StorageService,
  ) {}

  async findAll({ page, limit, ...filter }: ListModulesQueryDto) {
    const { items, total } = await this.modulesRepository.findPage(
      filter,
      (page - 1) * limit,
      limit,
    );
    return {
      items: await Promise.all(items.map((item) => this.present(item))),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    return this.present(await this.getOrThrow(id));
  }

  /** Returns null when the module does not exist (for callers that report it differently). */
  findById(id: string) {
    return this.modulesRepository.findById(id);
  }

  /** New modules start as DRAFT with the next free code, e.g. M004 (Decision Log D13). */
  async create(dto: CreateModuleDto) {
    try {
      return this.present(await this.modulesRepository.create(dto));
    } catch (error) {
      throw this.translateWriteError(error);
    }
  }

  /** The code never changes, even when the level or category does. */
  async update(id: string, dto: UpdateModuleDto) {
    try {
      return this.present(await this.modulesRepository.update(id, dto));
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
    const current = await this.getOrThrow(id);
    if (current.status === status) return this.present(current);

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

    return this.present(await this.modulesRepository.update(id, { status }));
  }

  /**
   * Stores the image under a new key, points the module at it, then removes
   * the previous image. If saving the module fails, the new file is removed.
   */
  async setThumbnail(id: string, file: Express.Multer.File) {
    const current = await this.getOrThrow(id);
    const key = MODULE_THUMBNAIL.key(
      id,
      randomUUID(),
      MODULE_THUMBNAIL.EXTENSIONS[file.mimetype],
    );

    await this.storage.upload(key, file.buffer, file.mimetype);
    let updated: Awaited<ReturnType<ModulesRepository['update']>>;
    try {
      updated = await this.modulesRepository.update(id, { thumbnailKey: key });
    } catch (error) {
      await this.deleteObject(key);
      throw this.translateWriteError(error, id);
    }

    if (current.thumbnailKey) await this.deleteObject(current.thumbnailKey);
    return this.present(updated);
  }

  async removeThumbnail(id: string) {
    const current = await this.getOrThrow(id);
    if (!current.thumbnailKey) return this.present(current);

    const updated = await this.modulesRepository.update(id, {
      thumbnailKey: null,
    });
    await this.deleteObject(current.thumbnailKey);
    return this.present(updated);
  }

  /**
   * Only Draft modules can be deleted, together with all their content
   * (Decision Log D18). Published content is unpublished instead. Deleting
   * hides the records; they stay in the database (PRD FR-CUR-012).
   */
  async remove(id: string): Promise<void> {
    const current = await this.getOrThrow(id);
    if (current.status !== ModuleStatus.DRAFT) {
      throw new ConflictException(MODULE_ERRORS.CANNOT_DELETE_PUBLISHED);
    }

    try {
      await this.modulesRepository.softDelete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
    if (current.thumbnailKey) await this.deleteObject(current.thumbnailKey);
  }

  private async getOrThrow(id: string) {
    const found = await this.modulesRepository.findById(id);
    if (!found) throw this.notFound(id);
    return found;
  }

  /** Replaces the private storage key with a short-lived signed URL. */
  private async present<T extends { thumbnailKey: string | null }>({
    thumbnailKey,
    ...module
  }: T) {
    return {
      ...module,
      thumbnailUrl: thumbnailKey
        ? await this.storage.getDownloadUrl(thumbnailKey)
        : null,
    };
  }

  /**
   * Best effort: the database is already correct, so a leftover file is only
   * wasted space and must not fail the request.
   */
  private async deleteObject(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Could not delete stored file ${key}: ${String(error)}`);
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

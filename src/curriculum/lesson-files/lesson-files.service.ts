import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { loadEsm } from 'load-esm';
import { randomUUID } from 'node:crypto';
import type { LessonFile } from '../../../generated/prisma/client';
import type { LessonFileGroup } from '../../../generated/prisma/enums';
import { isPrismaError } from '../../prisma/prisma-error.util';
import { StorageService } from '../../storage/storage.service';
import { LessonsService } from '../lessons/lessons.service';
import { RegisterFileDto, UpdateFileDto } from './dto/register-file.dto';
import { ReorderFilesDto } from './dto/reorder-files.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { LESSON_FILE, LESSON_FILE_ERRORS } from './lesson-file.constants';
import { LessonFilesRepository } from './lesson-files.repository';

/**
 * Lesson files are uploaded by the browser straight to storage (up to 200 MB),
 * then registered here after the real file type and size are checked.
 * Allowed in Draft and Published modules alike (Decision Log D28: "edit files").
 */
@Injectable()
export class LessonFilesService {
  private readonly logger = new Logger(LessonFilesService.name);

  constructor(
    private readonly lessonFilesRepository: LessonFilesRepository,
    private readonly lessonsService: LessonsService,
    private readonly storage: StorageService,
  ) {}

  async findAll(lessonId: string) {
    await this.requireLesson(lessonId);
    const files = await this.lessonFilesRepository.findByLesson(lessonId);
    return Promise.all(files.map((file) => this.present(file)));
  }

  /** Step 1: a signed URL the browser PUTs the file to. Nothing is saved yet. */
  async requestUpload(lessonId: string, dto: RequestUploadDto) {
    await this.requireLesson(lessonId);
    this.assertAllowed(dto.group, dto.contentType);

    const key = LESSON_FILE.key(
      lessonId,
      randomUUID(),
      extensionOf(dto.fileName),
    );
    const expiresIn = LESSON_FILE.UPLOAD_URL_TTL_SECONDS;
    const uploadUrl = await this.storage.getUploadUrl(
      key,
      dto.contentType,
      expiresIn,
    );
    return { uploadUrl, key, expiresIn };
  }

  /**
   * Step 2, after the upload: checks the stored object itself (the browser's
   * claims can't be trusted), then adds it at the end of its group. A rejected
   * upload is removed from storage.
   */
  async register(lessonId: string, dto: RegisterFileDto) {
    await this.requireLesson(lessonId);
    if (!LESSON_FILE.isKeyOf(lessonId, dto.key)) {
      throw new BadRequestException(LESSON_FILE_ERRORS.KEY_NOT_FOR_LESSON);
    }
    const stored = await this.storage.head(dto.key);
    if (!stored) throw new BadRequestException(LESSON_FILE_ERRORS.NOT_UPLOADED);

    const contentType = await this.verifyUpload(
      dto.key,
      dto.group,
      stored.size,
    );
    try {
      const file = await this.lessonFilesRepository.create({
        lessonId,
        group: dto.group,
        storageKey: dto.key,
        fileName: dto.fileName,
        contentType,
        sizeBytes: stored.size,
        captionEn: dto.captionEn ?? null,
        captionMy: dto.captionMy ?? null,
      });
      return this.present(file);
    } catch (error) {
      // The key already belongs to a registered file: keep the object.
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException(LESSON_FILE_ERRORS.ALREADY_REGISTERED);
      }
      await this.deleteObject(dto.key);
      throw error;
    }
  }

  async update(lessonId: string, id: string, dto: UpdateFileDto) {
    try {
      return this.present(
        await this.lessonFilesRepository.update(lessonId, id, dto),
      );
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  /** The list must contain every file of the group exactly once. */
  async reorder(lessonId: string, { group, fileIds }: ReorderFilesDto) {
    await this.requireLesson(lessonId);
    const current = await this.lessonFilesRepository.findByLesson(
      lessonId,
      group,
    );
    const currentIds = new Set(current.map((file) => file.id));
    const isSameSet =
      fileIds.length === currentIds.size &&
      fileIds.every((id) => currentIds.has(id));
    if (!isSameSet) {
      throw new BadRequestException(LESSON_FILE_ERRORS.REORDER_MISMATCH);
    }

    await this.lessonFilesRepository.reorder(lessonId, group, fileIds);
    const files = await this.lessonFilesRepository.findByLesson(
      lessonId,
      group,
    );
    return Promise.all(files.map((file) => this.present(file)));
  }

  /** Removes the file for good: the row, then the stored object. */
  async remove(lessonId: string, id: string): Promise<void> {
    let deleted: LessonFile;
    try {
      deleted = await this.lessonFilesRepository.delete(lessonId, id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
    await this.deleteObject(deleted.storageKey);
  }

  /** Size and real type (from the leading bytes) of an upload; returns the detected MIME type. */
  private async verifyUpload(
    key: string,
    group: LessonFileGroup,
    size: number,
  ): Promise<string> {
    let problem: string | undefined;
    let mime: string | undefined;
    if (size === 0) problem = LESSON_FILE_ERRORS.EMPTY;
    else if (size > LESSON_FILE.MAX_BYTES)
      problem = LESSON_FILE_ERRORS.TOO_LARGE;
    else {
      const head = await this.storage.readStart(key, LESSON_FILE.SNIFF_BYTES);
      mime = (await detectFileType(head))?.mime;
      if (!mime || !LESSON_FILE.ALLOWED_TYPES[group].test(mime)) {
        problem = LESSON_FILE_ERRORS.TYPE_NOT_ALLOWED(group);
      }
    }

    if (problem) {
      await this.deleteObject(key);
      throw new BadRequestException(problem);
    }
    return mime!;
  }

  private assertAllowed(group: LessonFileGroup, contentType: string) {
    if (!LESSON_FILE.ALLOWED_TYPES[group].test(contentType)) {
      throw new BadRequestException(LESSON_FILE_ERRORS.TYPE_NOT_ALLOWED(group));
    }
  }

  /** Swaps the internal storage key for a short-lived preview URL. */
  private async present({ storageKey, ...file }: LessonFile) {
    return { ...file, url: await this.storage.getDownloadUrl(storageKey) };
  }

  /** 404 "Lesson … not found" when the lesson doesn't exist or is deleted. */
  private requireLesson(lessonId: string) {
    return this.lessonsService.findOne(lessonId);
  }

  /** Best effort: a leftover object is harmless, a failed request is not. */
  private async deleteObject(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Could not delete stored file ${key}: ${String(error)}`);
    }
  }

  private notFound(id: string) {
    return new NotFoundException(LESSON_FILE_ERRORS.NOT_FOUND(id));
  }
}

/** Lower-case extension of a file name, or "bin"; only used to make keys readable. */
function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]{1,10})$/i.exec(fileName);
  return match ? match[1].toLowerCase() : 'bin';
}

/** `file-type` is ESM-only; load-esm imports it from this CommonJS build (as Nest's FileTypeValidator does). */
async function detectFileType(bytes: Uint8Array) {
  const fileType = await loadEsm<{
    fileTypeFromBuffer(
      bytes: Uint8Array,
    ): Promise<{ mime: string } | undefined>;
  }>('file-type');
  return fileType.fileTypeFromBuffer(bytes);
}

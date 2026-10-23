import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client';
import type { QuestionType } from '../../../generated/prisma/enums';
import { isPrismaError } from '../../prisma/prisma-error.util';
import { StorageService } from '../../storage/storage.service';
import { plainText } from '../shared/rich-text';
import { UnitsService } from '../units/units.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsQueryDto } from './dto/list-questions-query.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { normalizeAnswers } from './question-answers';
import { QUESTION_ERRORS, QUESTION_MEDIA } from './question.constants';
import {
  type QuestionRow,
  QuestionsRepository,
  UnknownMediaError,
} from './questions.repository';

/** Rich-text JSON from a DTO: null clears a nullable column. */
const jsonOrNull = (value: Prisma.InputJsonObject | null | undefined) =>
  value === null ? Prisma.DbNull : value;

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(
    private readonly questionsRepository: QuestionsRepository,
    private readonly unitsService: UnitsService,
    private readonly storage: StorageService,
  ) {}

  async findAll({ page, limit, ...filter }: ListQuestionsQueryDto) {
    const { items, total } = await this.questionsRepository.findPage(
      filter,
      (page - 1) * limit,
      limit,
    );
    const presented = items.map(({ quizzes, ...question }) => ({
      ...question,
      quizzes: quizzes.map(({ quiz }) => quiz),
    }));
    return { items: presented, total, page, limit };
  }

  async findOne(id: string) {
    return this.present(await this.getOrThrow(id));
  }

  /** The live questions among `ids`, for adding them to quizzes. */
  findLiveByIds(ids: string[]) {
    return this.questionsRepository.findLiveByIds(ids);
  }

  /** A new question gets the next free code (e.g. QN003); its images are attached. */
  async create(dto: CreateQuestionDto) {
    const unit = await this.unitsService.findById(dto.unitId);
    if (!unit) throw new BadRequestException(QUESTION_ERRORS.UNIT_NOT_FOUND);

    const content = this.prepareContent(
      dto.type,
      dto.prompt,
      dto.answers,
      dto.promptMediaIds ?? [],
    );
    try {
      const question = await this.questionsRepository.create(
        {
          unitId: dto.unitId,
          type: dto.type,
          points: dto.points,
          explanation: jsonOrNull(dto.explanation),
          ...content.data,
        },
        content.mediaIds,
      );
      return this.present(question);
    } catch (error) {
      throw this.translateMediaError(error);
    }
  }

  /**
   * Updates any field but the unit. Changing the type, prompt, answers or prompt
   * images re-checks them together, using the stored values for what wasn't sent.
   */
  async update(id: string, dto: UpdateQuestionDto) {
    const current = await this.getOrThrow(id);
    const touchesContent =
      dto.type !== undefined ||
      dto.prompt !== undefined ||
      dto.answers !== undefined ||
      dto.promptMediaIds !== undefined;
    const content = touchesContent
      ? this.prepareContent(
          dto.type ?? current.type,
          dto.prompt ?? (current.prompt as Prisma.InputJsonObject),
          dto.answers ?? (current.answers as Record<string, unknown>),
          dto.promptMediaIds ?? current.promptMediaIds,
        )
      : undefined;

    try {
      const { question, removedKeys } = await this.questionsRepository.update(
        id,
        {
          type: dto.type,
          points: dto.points,
          explanation: jsonOrNull(dto.explanation),
          ...content?.data,
        },
        content?.mediaIds,
      );
      await Promise.all(removedKeys.map((key) => this.deleteObject(key)));
      return this.present(question);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw this.translateMediaError(error);
    }
  }

  /** Decision Log D18: a question used in a quiz can't be deleted. */
  async remove(id: string): Promise<void> {
    const question = await this.getOrThrow(id);
    if (question.quizzes.length > 0) {
      throw new ConflictException(
        QUESTION_ERRORS.IN_USE(question.quizzes.map(({ quiz }) => quiz.code)),
      );
    }
    try {
      await this.questionsRepository.softDelete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  /**
   * Stores an image for a question that is being written. It belongs to no
   * question until one is saved with its id. If saving the row fails, the file is removed.
   */
  async uploadMedia(file: Express.Multer.File) {
    const key = QUESTION_MEDIA.key(
      randomUUID(),
      QUESTION_MEDIA.EXTENSIONS[file.mimetype],
    );
    await this.storage.upload(key, file.buffer, file.mimetype);
    try {
      const media = await this.questionsRepository.createMedia({
        storageKey: key,
        contentType: file.mimetype,
        sizeBytes: file.size,
      });
      return {
        id: media.id,
        contentType: media.contentType,
        sizeBytes: media.sizeBytes,
        url: await this.storage.getDownloadUrl(key),
      };
    } catch (error) {
      await this.deleteObject(key);
      throw error;
    }
  }

  /** Checks the prompt and answers for the type; returns the columns to save and every image id used. */
  private prepareContent(
    type: QuestionType,
    prompt: Prisma.InputJsonObject,
    rawAnswers: Record<string, unknown>,
    promptMediaIds: string[],
  ) {
    const promptText = plainText(prompt);
    const { answers, mediaIds, errors } = normalizeAnswers(
      type,
      rawAnswers,
      promptText,
    );
    if (!promptText) errors.unshift(QUESTION_ERRORS.PROMPT_EMPTY);
    if (errors.length > 0) throw new BadRequestException(errors);

    return {
      data: {
        prompt,
        promptText,
        promptMediaIds,
        answers: answers as Prisma.InputJsonObject,
      },
      mediaIds: [...new Set([...promptMediaIds, ...mediaIds])],
    };
  }

  /** Swaps storage keys for signed URLs and flattens the quiz references. */
  private async present({ media, quizzes, ...question }: QuestionRow) {
    return {
      ...question,
      quizzes: quizzes.map(({ quiz }) => quiz),
      media: await Promise.all(
        media.map(async ({ storageKey, ...rest }) => ({
          ...rest,
          url: await this.storage.getDownloadUrl(storageKey),
        })),
      ),
    };
  }

  private async getOrThrow(id: string) {
    const found = await this.questionsRepository.findById(id);
    if (!found) throw this.notFound(id);
    return found;
  }

  private translateMediaError(error: unknown) {
    return error instanceof UnknownMediaError
      ? new BadRequestException(QUESTION_ERRORS.MEDIA_NOT_FOUND)
      : error;
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
    return new NotFoundException(QUESTION_ERRORS.NOT_FOUND(id));
  }
}

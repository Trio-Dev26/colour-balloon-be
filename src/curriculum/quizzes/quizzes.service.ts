import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { QuizType } from '../../../generated/prisma/enums';
import {
  isPrismaError,
  violatedConstraint,
} from '../../prisma/prisma-error.util';
import { ModulesService } from '../modules/modules.service';
import { QuestionsService } from '../questions/questions.service';
import { UnitsService } from '../units/units.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { ListQuizzesQueryDto } from './dto/list-quizzes-query.dto';
import { SetQuizQuestionsDto } from './dto/set-quiz-questions.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QUIZ_ERRORS, QUIZ_UNIQUE_VIOLATIONS } from './quiz.constants';
import { QuizzesRepository } from './quizzes.repository';

/** Rich-text JSON from a DTO: null clears a nullable column. */
const jsonOrNull = (value: Prisma.InputJsonObject | null | undefined) =>
  value === null ? Prisma.DbNull : value;

/**
 * Unit quizzes and the module's Chapter End Test (Decision Log D16, D20, D21).
 * Quizzes can be edited in any module status (D28).
 */
@Injectable()
export class QuizzesService {
  constructor(
    private readonly quizzesRepository: QuizzesRepository,
    private readonly modulesService: ModulesService,
    private readonly unitsService: UnitsService,
    private readonly questionsService: QuestionsService,
  ) {}

  async findAll({ page, limit, ...filter }: ListQuizzesQueryDto) {
    const { items, total } = await this.quizzesRepository.findPage(
      filter,
      (page - 1) * limit,
      limit,
    );
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const found = await this.quizzesRepository.findById(id);
    if (!found) throw this.notFound(id);
    return found;
  }

  /** A new quiz gets the next free code (e.g. QZ003) and starts with no questions. */
  async create(dto: CreateQuizDto) {
    const { moduleId, unitId } = await this.resolvePlacement(dto);
    const isChapterEndTest = dto.type === QuizType.CHAPTER_END_TEST;
    if (isChapterEndTest && dto.required === false) {
      throw new BadRequestException(QUIZ_ERRORS.CET_ALWAYS_REQUIRED);
    }
    try {
      return await this.quizzesRepository.create({
        type: dto.type,
        moduleId,
        unitId,
        required: isChapterEndTest || (dto.required ?? true),
        passPercent: dto.passPercent,
        titleEn: dto.titleEn,
        titleMy: dto.titleMy,
        descriptionEn: jsonOrNull(dto.descriptionEn),
        descriptionMy: jsonOrNull(dto.descriptionMy),
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        const message = QUIZ_UNIQUE_VIOLATIONS[violatedConstraint(error) ?? ''];
        if (message) throw new ConflictException(message);
      }
      throw error;
    }
  }

  /** Titles, descriptions, pass mark and Required/Optional; type, module and unit never change. */
  async update(id: string, dto: UpdateQuizDto) {
    const current = await this.findOne(id);
    if (current.type === QuizType.CHAPTER_END_TEST && dto.required === false) {
      throw new BadRequestException(QUIZ_ERRORS.CET_ALWAYS_REQUIRED);
    }
    try {
      return await this.quizzesRepository.update(id, {
        ...dto,
        descriptionEn: jsonOrNull(dto.descriptionEn),
        descriptionMy: jsonOrNull(dto.descriptionMy),
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  /**
   * Saves the quiz's whole ordered question list. A unit quiz takes questions
   * from its own unit; the Chapter End Test from any unit of its module (D16, D20).
   */
  async setQuestions(id: string, { questionIds }: SetQuizQuestionsDto) {
    const quiz = await this.findOne(id);
    const found = await this.questionsService.findLiveByIds(questionIds);

    const foundIds = new Set(found.map((question) => question.id));
    const missing = questionIds.filter(
      (questionId) => !foundIds.has(questionId),
    );
    if (missing.length > 0) {
      throw new BadRequestException(QUIZ_ERRORS.QUESTIONS_NOT_FOUND(missing));
    }

    const isUnitQuiz = quiz.type === QuizType.UNIT_QUIZ;
    const outside = found
      .filter((question) =>
        isUnitQuiz
          ? question.unitId !== quiz.unitId
          : question.unit.moduleId !== quiz.moduleId,
      )
      .map((question) => question.code);
    if (outside.length > 0) {
      throw new BadRequestException(
        isUnitQuiz
          ? QUIZ_ERRORS.QUESTIONS_OUTSIDE_UNIT(outside)
          : QUIZ_ERRORS.QUESTIONS_OUTSIDE_MODULE(outside),
      );
    }

    return this.quizzesRepository.setQuestions(id, questionIds);
  }

  async remove(id: string): Promise<void> {
    // TODO(D18): once attempts are tracked, refuse it in a Published/Unpublished
    // module when a student has attempted the quiz ("unpublish instead").
    try {
      await this.quizzesRepository.softDelete(id);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw this.notFound(id);
      throw error;
    }
  }

  /** Where a new quiz belongs: a unit quiz's module comes from its unit; a Chapter End Test has no unit. */
  private async resolvePlacement(
    dto: CreateQuizDto,
  ): Promise<{ moduleId: string; unitId: string | null }> {
    if (dto.type === QuizType.UNIT_QUIZ) {
      if (!dto.unitId) throw new BadRequestException(QUIZ_ERRORS.UNIT_REQUIRED);
      const unit = await this.unitsService.findById(dto.unitId);
      if (!unit) throw new BadRequestException(QUIZ_ERRORS.UNIT_NOT_FOUND);
      if (dto.moduleId && dto.moduleId !== unit.moduleId) {
        throw new BadRequestException(QUIZ_ERRORS.UNIT_NOT_IN_MODULE);
      }
      return { moduleId: unit.moduleId, unitId: unit.id };
    }

    if (dto.unitId) throw new BadRequestException(QUIZ_ERRORS.CET_HAS_NO_UNIT);
    if (!dto.moduleId)
      throw new BadRequestException(QUIZ_ERRORS.MODULE_REQUIRED);
    if (!(await this.modulesService.findById(dto.moduleId))) {
      throw new BadRequestException(QUIZ_ERRORS.MODULE_NOT_FOUND);
    }
    return { moduleId: dto.moduleId, unitId: null };
  }

  private notFound(id: string) {
    return new NotFoundException(QUIZ_ERRORS.NOT_FOUND(id));
  }
}

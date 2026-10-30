import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import type { QuizType } from '../../../generated/prisma/enums';
import { nextCodeNumber } from '../../prisma/code-sequence';
import { PrismaService } from '../../prisma/prisma.service';
import { CODE_PREFIX, formatCode } from '../shared/codes';
import { NOT_DELETED } from '../shared/soft-delete';

export interface QuizFilter {
  moduleId?: string;
  unitId?: string;
  type?: QuizType;
  /** Case-insensitive match on the code, English title or Myanmar title. */
  search?: string;
}

const QUIZ_INCLUDE = {
  module: {
    select: {
      id: true,
      code: true,
      titleEn: true,
      titleMy: true,
      status: true,
    },
  },
  unit: { select: { id: true, code: true, titleEn: true, titleMy: true } },
  // A deleted question drops out of every quiz and its total.
  questions: {
    where: { question: NOT_DELETED },
    orderBy: { sequence: 'asc' },
    select: {
      question: {
        select: {
          id: true,
          code: true,
          type: true,
          promptText: true,
          points: true,
          // The Chapter End Test mixes units; the dashboard shows each question's unit.
          unit: { select: { id: true, code: true } },
        },
      },
    },
  },
} as const satisfies Prisma.QuizInclude;

type QuizRow = Prisma.QuizGetPayload<{ include: typeof QUIZ_INCLUDE }>;

/** Flattens the question list and adds its count and point total (D21: never typed). */
const toQuiz = ({ questions, ...quiz }: QuizRow) => ({
  ...quiz,
  questionCount: questions.length,
  totalPoints: questions.reduce(
    (sum, { question }) => sum + question.points,
    0,
  ),
  questions: questions.map(({ question }, index) => ({
    ...question,
    sequence: index + 1,
  })),
});

/** Module, unit quizzes before the Chapter End Test, unit order, then code. */
const QUIZ_ORDER: Prisma.QuizOrderByWithRelationInput[] = [
  { module: { code: 'asc' } },
  { type: 'asc' },
  { unit: { sequence: 'asc' } },
  { code: 'asc' },
];

/** All database access for quizzes. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class QuizzesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: QuizFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quiz.findMany({
        where,
        include: QUIZ_INCLUDE,
        orderBy: QUIZ_ORDER,
        skip,
        take,
      }),
      this.prisma.quiz.count({ where }),
    ]);
    return { items: rows.map(toQuiz), total };
  }

  async findById(id: string) {
    const row = await this.prisma.quiz.findUnique({
      where: { id, ...NOT_DELETED },
      include: QUIZ_INCLUDE,
    });
    return row && toQuiz(row);
  }

  /**
   * Inserts the quiz with the next free code (e.g. QZ004). Throws P2002 on
   * `quizzes_one_cet_per_module` when the module already has a Chapter End Test.
   */
  create(data: Omit<Prisma.QuizUncheckedCreateInput, 'code'>) {
    const prefix = CODE_PREFIX.quiz;
    return this.prisma.$transaction(async (tx) => {
      const code = formatCode(prefix, await nextCodeNumber(tx, prefix));
      const row = await tx.quiz.create({
        data: { ...data, code },
        include: QUIZ_INCLUDE,
      });
      return toQuiz(row);
    });
  }

  /** Throws P2025 when the quiz doesn't exist or is deleted. */
  async update(id: string, data: Prisma.QuizUncheckedUpdateInput) {
    const row = await this.prisma.quiz.update({
      where: { id, ...NOT_DELETED },
      data,
      include: QUIZ_INCLUDE,
    });
    return toQuiz(row);
  }

  /** Replaces the quiz's questions with `questionIds`, in that order, atomically. */
  setQuestions(id: string, questionIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({ where: { quizId: id } });
      await tx.quizQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          quizId: id,
          questionId,
          sequence: index + 1,
        })),
      });
      const row = await tx.quiz.findUniqueOrThrow({
        where: { id },
        include: QUIZ_INCLUDE,
      });
      return toQuiz(row);
    });
  }

  /** Hides the quiz (PRD FR-CUR-012). Throws P2025 when it doesn't exist or is already deleted. */
  async softDelete(id: string): Promise<void> {
    await this.prisma.quiz.update({
      where: { id, ...NOT_DELETED },
      data: { deletedAt: new Date() },
    });
  }

  private toWhere({
    moduleId,
    unitId,
    type,
    search,
  }: QuizFilter): Prisma.QuizWhereInput {
    return {
      ...NOT_DELETED,
      moduleId,
      unitId,
      type,
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { titleEn: { contains: search, mode: 'insensitive' } },
          { titleMy: { contains: search } },
        ],
      }),
    };
  }
}

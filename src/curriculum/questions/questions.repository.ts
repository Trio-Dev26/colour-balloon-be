import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import type { QuestionType } from '../../../generated/prisma/enums';
import { nextCodeNumber } from '../../prisma/code-sequence';
import { PrismaService } from '../../prisma/prisma.service';
import { CODE_PREFIX, formatCode } from '../shared/codes';
import { NOT_DELETED } from '../shared/soft-delete';

export interface QuestionFilter {
  moduleId?: string;
  unitId?: string;
  type?: QuestionType;
  /** Case-insensitive match on the code or the prompt text. */
  search?: string;
}

/** Thrown inside a save when an image id is unknown or belongs to another question; the save rolls back. */
export class UnknownMediaError extends Error {}

const QUESTION_LIST_INCLUDE = {
  unit: {
    select: {
      id: true,
      code: true,
      titleEn: true,
      titleMy: true,
      module: {
        select: {
          id: true,
          code: true,
          titleEn: true,
          titleMy: true,
          status: true,
        },
      },
    },
  },
  // Live quizzes only: a deleted quiz doesn't block deleting the question (D18).
  quizzes: {
    where: { quiz: NOT_DELETED },
    select: { quiz: { select: { id: true, code: true } } },
    orderBy: { quiz: { code: 'asc' } },
  },
} as const satisfies Prisma.QuestionInclude;

const QUESTION_INCLUDE = {
  ...QUESTION_LIST_INCLUDE,
  media: {
    select: { id: true, storageKey: true, contentType: true },
    orderBy: { createdAt: 'asc' },
  },
} as const satisfies Prisma.QuestionInclude;

export type QuestionRow = Prisma.QuestionGetPayload<{
  include: typeof QUESTION_INCLUDE;
}>;

/** Module, then unit order, then code. */
const QUESTION_ORDER: Prisma.QuestionOrderByWithRelationInput[] = [
  { unit: { module: { code: 'asc' } } },
  { unit: { sequence: 'asc' } },
  { code: 'asc' },
];

/**
 * Makes `mediaIds` exactly the question's images: attaches the given uploads
 * (which must be unused or already this question's) and removes the rest.
 * Returns the storage keys of the removed images, to delete after commit.
 */
async function syncMedia(
  tx: Prisma.TransactionClient,
  questionId: string,
  mediaIds: string[],
): Promise<string[]> {
  const attached = await tx.questionMedia.updateMany({
    where: {
      id: { in: mediaIds },
      OR: [{ questionId: null }, { questionId }],
    },
    data: { questionId },
  });
  if (attached.count !== mediaIds.length) throw new UnknownMediaError();

  const unused = await tx.questionMedia.findMany({
    where: { questionId, id: { notIn: mediaIds } },
    select: { id: true, storageKey: true },
  });
  await tx.questionMedia.deleteMany({
    where: { id: { in: unused.map((media) => media.id) } },
  });
  return unused.map((media) => media.storageKey);
}

/** All database access for questions and their images. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(filter: QuestionFilter, skip: number, take: number) {
    const where = this.toWhere(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where,
        include: QUESTION_LIST_INCLUDE,
        orderBy: QUESTION_ORDER,
        skip,
        take,
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.question.findUnique({
      where: { id, ...NOT_DELETED },
      include: QUESTION_INCLUDE,
    });
  }

  /** The live questions among `ids`, with their unit's module (for adding them to quizzes). */
  findLiveByIds(ids: string[]) {
    return this.prisma.question.findMany({
      where: { id: { in: ids }, ...NOT_DELETED },
      select: {
        id: true,
        code: true,
        unitId: true,
        unit: { select: { moduleId: true } },
      },
    });
  }

  /** Inserts the question with the next free code (e.g. QN012) and attaches its images. */
  create(
    data: Omit<Prisma.QuestionUncheckedCreateInput, 'code'>,
    mediaIds: string[],
  ) {
    const prefix = CODE_PREFIX.question;
    return this.prisma.$transaction(async (tx) => {
      const code = formatCode(prefix, await nextCodeNumber(tx, prefix));
      const { id } = await tx.question.create({ data: { ...data, code } });
      await syncMedia(tx, id, mediaIds);
      return tx.question.findUniqueOrThrow({
        where: { id },
        include: QUESTION_INCLUDE,
      });
    });
  }

  /**
   * Updates the question; with `mediaIds`, also makes them its exact set of
   * images. Throws P2025 when the question doesn't exist or is deleted.
   */
  update(
    id: string,
    data: Prisma.QuestionUncheckedUpdateInput,
    mediaIds?: string[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.question.update({ where: { id, ...NOT_DELETED }, data });
      const removedKeys = mediaIds ? await syncMedia(tx, id, mediaIds) : [];
      const question = await tx.question.findUniqueOrThrow({
        where: { id },
        include: QUESTION_INCLUDE,
      });
      return { question, removedKeys };
    });
  }

  /** Hides the question (PRD FR-CUR-012); its images stay. Throws P2025 when it doesn't exist or is already deleted. */
  async softDelete(id: string): Promise<void> {
    await this.prisma.question.update({
      where: { id, ...NOT_DELETED },
      data: { deletedAt: new Date() },
    });
  }

  /** An uploaded image not yet used by any question. */
  createMedia(
    data: Omit<Prisma.QuestionMediaUncheckedCreateInput, 'questionId'>,
  ) {
    return this.prisma.questionMedia.create({ data });
  }

  private toWhere({
    moduleId,
    unitId,
    type,
    search,
  }: QuestionFilter): Prisma.QuestionWhereInput {
    return {
      ...NOT_DELETED,
      unitId,
      type,
      ...(moduleId && { unit: { moduleId } }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { promptText: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
  }
}

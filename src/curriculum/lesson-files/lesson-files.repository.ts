import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import type { LessonFileGroup } from '../../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

/** Groups in declaration order (student first), then the admin's order inside each. */
const FILE_ORDER: Prisma.LessonFileOrderByWithRelationInput[] = [
  { group: 'asc' },
  { sequence: 'asc' },
  { id: 'asc' },
];

/** All database access for lesson files. Throws Prisma errors untouched; the service interprets them. */
@Injectable()
export class LessonFilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByLesson(lessonId: string, group?: LessonFileGroup) {
    return this.prisma.lessonFile.findMany({
      where: { lessonId, group },
      orderBy: FILE_ORDER,
    });
  }

  /**
   * Inserts the file at the end of its group. Locks the lesson row first, so
   * concurrent uploads to the same lesson get distinct positions.
   * Throws P2002 when the storage key is already registered.
   */
  create(data: Omit<Prisma.LessonFileUncheckedCreateInput, 'sequence'>) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM lessons WHERE id = ${data.lessonId}::uuid FOR UPDATE`;
      const { _max } = await tx.lessonFile.aggregate({
        where: { lessonId: data.lessonId, group: data.group },
        _max: { sequence: true },
      });
      return tx.lessonFile.create({
        data: { ...data, sequence: (_max.sequence ?? 0) + 1 },
      });
    });
  }

  /** Throws P2025 when the file isn't in this lesson. */
  update(
    lessonId: string,
    id: string,
    data: Pick<Prisma.LessonFileUpdateInput, 'captionEn' | 'captionMy'>,
  ) {
    return this.prisma.lessonFile.update({ where: { id, lessonId }, data });
  }

  /** Sets each file's position to its index in `fileIds` (1-based), atomically. */
  async reorder(
    lessonId: string,
    group: LessonFileGroup,
    fileIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction(
      fileIds.map((id, index) =>
        this.prisma.lessonFile.update({
          where: { id, lessonId, group },
          data: { sequence: index + 1 },
        }),
      ),
    );
  }

  /**
   * Removes the row and moves the files after it up one place, so the order
   * stays 1..n. Returns the deleted row (its storage key is needed afterwards).
   * Throws P2025 when the file isn't in this lesson.
   */
  delete(lessonId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.lessonFile.delete({ where: { id, lessonId } });
      await tx.lessonFile.updateMany({
        where: {
          lessonId,
          group: deleted.group,
          sequence: { gt: deleted.sequence },
        },
        data: { sequence: { decrement: 1 } },
      });
      return deleted;
    });
  }
}

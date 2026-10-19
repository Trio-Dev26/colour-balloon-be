/** Error messages returned by the lesson routes. */
export const LESSON_ERRORS = {
  NOT_FOUND: (id: string) => `Lesson ${id} not found`,
  UNIT_NOT_FOUND: 'Unit does not exist',
  MOVE_ACROSS_MODULES:
    'A lesson can only move to another unit of the same module',
  REORDER_MISMATCH: 'lessonIds must list every lesson of the unit exactly once',
} as const;

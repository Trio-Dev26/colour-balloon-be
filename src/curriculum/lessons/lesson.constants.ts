/** Error messages returned by the lesson routes. */
export const LESSON_ERRORS = {
  NOT_FOUND: (id: string) => `Lesson ${id} not found`,
  UNIT_NOT_FOUND: 'Unit does not exist',
  REORDER_MISMATCH: 'lessonIds must list every lesson of the unit exactly once',
  // Decision Log D28: moving and reordering are Draft-only.
  MOVE_NEEDS_DRAFT:
    'A lesson can move only between units of Draft modules. Published and Unpublished modules have no Move.',
  REORDER_NEEDS_DRAFT:
    'Lessons can be reordered only in a Draft module. A published module keeps its order.',
  // D18 asks "has a student started it?"; progress isn't tracked yet, so any non-Draft module blocks it.
  DELETE_NEEDS_DRAFT:
    'Lessons in a published module can’t be deleted yet. Delete lessons while the module is Draft.',
} as const;

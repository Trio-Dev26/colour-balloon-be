/** Error messages returned by the quiz routes. */
export const QUIZ_ERRORS = {
  NOT_FOUND: (id: string) => `Quiz ${id} not found`,
  // Decision Log D16, D20.
  UNIT_REQUIRED: 'A unit quiz needs unitId',
  UNIT_NOT_FOUND: 'Unit does not exist',
  UNIT_NOT_IN_MODULE: 'The unit is not in that module',
  MODULE_REQUIRED: 'A Chapter End Test needs moduleId',
  MODULE_NOT_FOUND: 'Module does not exist',
  CET_HAS_NO_UNIT:
    'A Chapter End Test covers the whole module; leave unitId out',
  CET_EXISTS: 'This module already has a Chapter End Test',
  CET_ALWAYS_REQUIRED: 'The Chapter End Test is always required',
  QUESTIONS_NOT_FOUND: (ids: string[]) =>
    `These questions do not exist: ${ids.join(', ')}`,
  QUESTIONS_OUTSIDE_UNIT: (codes: string[]) =>
    `${codes.join(', ')} belong to another unit; a unit quiz uses questions from its own unit`,
  QUESTIONS_OUTSIDE_MODULE: (codes: string[]) =>
    `${codes.join(', ')} belong to another module`,
} as const;

/** Unique indexes on quizzes and the message each violation maps to. */
export const QUIZ_UNIQUE_VIOLATIONS: Readonly<Record<string, string>> = {
  quizzes_one_cet_per_module: QUIZ_ERRORS.CET_EXISTS,
};

export const MAX_QUIZ_QUESTIONS = 200;

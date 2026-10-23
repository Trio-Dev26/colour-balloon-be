import { IMAGE_UPLOAD } from '../shared/image-upload';

/** Error messages returned by the question routes. */
export const QUESTION_ERRORS = {
  NOT_FOUND: (id: string) => `Question ${id} not found`,
  UNIT_NOT_FOUND: 'Unit does not exist',
  PROMPT_EMPTY: 'prompt must contain some text',
  MEDIA_NOT_FOUND:
    'An image id is unknown or belongs to another question; upload the image again',
  // Decision Log D18.
  IN_USE: (quizCodes: string[]) =>
    `Used in ${quizCodes.join(', ')}. Remove it from those quizzes first.`,
} as const;

/** Size limits for a question's answers (PRD FR-QB-003..007). */
export const QUESTION_LIMITS = {
  MIN_ITEMS: 2,
  MAX_ITEMS: 20,
  MAX_ITEM_TEXT: 500,
  MAX_ACCEPTED: 20,
  MAX_ACCEPTED_TEXT: 200,
  MAX_PROMPT_IMAGES: 5,
  MAX_POINTS: 100,
} as const;

/** Question images: JPG/PNG up to 20 MB (BR-16), one object per upload. */
export const QUESTION_MEDIA = {
  ...IMAGE_UPLOAD,
  key: (uuid: string, extension: string) => `questions/${uuid}.${extension}`,
} as const;

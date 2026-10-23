import { LessonFileGroup } from '../../../generated/prisma/enums';

const VIEWABLE =
  /^(application\/pdf|video\/(mp4|webm)|audio\/.+|image\/(jpeg|png|webp))$/;
/** Decision Log D19: downloads are PDF, audio and images only (no video, no Word/PowerPoint). */
const DOWNLOADABLE = /^(application\/pdf|audio\/.+|image\/(jpeg|png|webp))$/;

export const LESSON_FILE = {
  /** PRD FR-FILE-002 / BR-16. */
  MAX_BYTES: 200 * 1024 * 1024,
  /** Per caption, English and Myanmar alike. */
  CAPTION_MAX: 500,
  /** How long a signed upload URL stays valid; the PUT only has to start in time. */
  UPLOAD_URL_TTL_SECONDS: 15 * 60,
  /** Enough leading bytes for `file-type` to recognise every allowed format. */
  SNIFF_BYTES: 4100,
  ALLOWED_TYPES: {
    STUDENT_VIEW: VIEWABLE,
    STUDENT_DOWNLOAD: DOWNLOADABLE,
    TEACHER_VIEW: VIEWABLE,
    TEACHER_DOWNLOAD: DOWNLOADABLE,
  } satisfies Record<LessonFileGroup, RegExp>,
  /** Object key: one folder per lesson, a random name (the original name is kept in the row). */
  key: (lessonId: string, uuid: string, extension: string) =>
    `lessons/${lessonId}/${uuid}.${extension}`,
  /** True only for keys this API could have issued for the lesson. */
  isKeyOf: (lessonId: string, key: string) =>
    new RegExp(`^lessons/${lessonId}/[0-9a-f-]{36}\\.[a-z0-9]{1,10}$`).test(
      key,
    ),
} as const;

/** Error messages returned by the lesson file routes. */
export const LESSON_FILE_ERRORS = {
  NOT_FOUND: (id: string) => `File ${id} not found in this lesson`,
  TYPE_NOT_ALLOWED: (group: LessonFileGroup) =>
    group.endsWith('DOWNLOAD')
      ? 'Downloadable files must be PDF, audio or image (JPG, PNG, WebP)'
      : 'Files must be PDF, video (MP4, WebM), audio or image (JPG, PNG, WebP)',
  TOO_LARGE: 'Files can be at most 200 MB',
  EMPTY: 'The file is empty',
  KEY_NOT_FOR_LESSON: 'key was not issued for this lesson',
  NOT_UPLOADED: 'Nothing has been uploaded to this key yet',
  ALREADY_REGISTERED: 'This upload is already registered',
  REORDER_MISMATCH: 'fileIds must list every file of the group exactly once',
} as const;

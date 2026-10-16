/** Error messages returned by the module routes. */
export const MODULE_ERRORS = {
  NOT_FOUND: (id: string) => `Module ${id} not found`,
  ALREADY_EXISTS: 'Module already exists',
  TITLE_EN_TAKEN: 'A module with this English title already exists',
  TITLE_MY_TAKEN: 'A module with this Myanmar title already exists',
  LEVEL_NOT_FOUND: 'Level does not exist',
  CATEGORY_NOT_FOUND: 'Category does not exist',
  LEVEL_OR_CATEGORY_NOT_FOUND: 'Level or category does not exist',
  // Status rules (Decision Log D17)
  CANNOT_RETURN_TO_DRAFT:
    'A module that has been published cannot go back to Draft',
  CANNOT_UNPUBLISH_DRAFT: 'Only a published module can be unpublished',
  PUBLISH_NEEDS_UNIT: 'Add at least one unit before publishing this module',
  // Delete rules (Decision Log D18)
  CANNOT_DELETE_PUBLISHED:
    'This module has been published and cannot be deleted. Unpublish it instead.',
} as const;

// Constraint names follow Prisma's "<table>_<column>_key" / "_fkey" convention.
export const MODULE_UNIQUE_VIOLATIONS: Readonly<Record<string, string>> = {
  modules_title_en_key: MODULE_ERRORS.TITLE_EN_TAKEN,
  modules_title_my_key: MODULE_ERRORS.TITLE_MY_TAKEN,
};

export const MODULE_FOREIGN_KEY_VIOLATIONS: Readonly<Record<string, string>> = {
  modules_level_id_fkey: MODULE_ERRORS.LEVEL_NOT_FOUND,
  modules_category_id_fkey: MODULE_ERRORS.CATEGORY_NOT_FOUND,
};

/** Thumbnail upload rules (PRD FR-CUR-002: JPG/PNG up to 20 MB). */
export const MODULE_THUMBNAIL = {
  FIELD: 'file',
  MAX_BYTES: 20 * 1024 * 1024,
  /** Checked against the file's real bytes, not the client-sent content type. */
  MIME_TYPES: /^image\/(jpeg|png)$/,
  EXTENSIONS: { 'image/jpeg': 'jpg', 'image/png': 'png' } as Record<
    string,
    string
  >,
  /** Object key: one folder per module, a fresh name per upload (no stale caches). */
  key: (moduleId: string, uuid: string, extension: string) =>
    `modules/${moduleId}/thumbnail-${uuid}.${extension}`,
} as const;

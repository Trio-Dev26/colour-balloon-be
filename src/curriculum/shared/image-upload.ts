/** Image upload rules shared by module thumbnails and question images (PRD BR-16: JPG/PNG up to 20 MB). */
export const IMAGE_UPLOAD = {
  FIELD: 'file',
  MAX_BYTES: 20 * 1024 * 1024,
  /** Checked against the file's real bytes, not the client-sent content type. */
  MIME_TYPES: /^image\/(jpeg|png)$/,
  EXTENSIONS: { 'image/jpeg': 'jpg', 'image/png': 'png' } as Record<
    string,
    string
  >,
} as const;

import { registerAs } from '@nestjs/config';

/** S3-compatible object storage: MinIO locally, DigitalOcean Spaces / R2 in production. */
export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
  bucket: process.env.STORAGE_BUCKET ?? 'colour-balloon',
  // MinIO needs path-style URLs; Spaces and R2 use virtual-hosted style ("false").
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
}));

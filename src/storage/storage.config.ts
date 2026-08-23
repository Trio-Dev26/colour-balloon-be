import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? 'minioadmin',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? 'minioadmin',
  bucket: process.env.STORAGE_BUCKET ?? 'colour-balloon',
  // MinIO needs path-style requests; R2 (and most managed S3 providers)
  // use virtual-hosted-style, so this must be "false" in production.
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
}));

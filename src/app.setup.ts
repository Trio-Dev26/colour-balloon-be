import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

/**
 * HTTP-level configuration shared by the real app (main.ts) and the e2e tests,
 * so tests exercise exactly the pipes, cookies and CORS rules used in production.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());
  app.enableCors({
    // Comma-separated list. Credentials require explicit origins, never "*".
    origin:
      app.get(ConfigService).get<string>('CORS_ORIGIN')?.split(',') ?? false,
    credentials: true,
  });
}

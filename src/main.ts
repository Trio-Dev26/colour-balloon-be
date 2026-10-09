import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // a missing refresh secret makes jwt sign refresh tokens with the access secret,
  // so refresh tokens would work as access tokens; refuse to start instead
  const jwtSecret = configService.get<string>('JWT_SECRET');
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!jwtSecret || !refreshSecret || jwtSecret === refreshSecret) {
    throw new Error(
      'JWT_SECRET and JWT_REFRESH_SECRET must both be set and different',
    );
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.use(cookieParser());
  app.enableCors({
    // comma-separated list; must be explicit origins (not *) for credentials
    origin: configService.get<string>('CORS_ORIGIN')?.split(',') ?? false,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Colour Balloon API')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger docs: ${await app.getUrl()}/docs`);
}
bootstrap();

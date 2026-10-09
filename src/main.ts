import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

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

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Colour Balloon API')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger docs: ${await app.getUrl()}/docs`);
}
void bootstrap();

import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProd = config.get('NODE_ENV') === 'production';

  configureApp(app);
  app.enableShutdownHooks();

  if (!isProd || config.get('SWAGGER_ENABLED') === 'true') {
    const doc = new DocumentBuilder()
      .setTitle('CAPH-CI — API du module OPH')
      .setDescription('Espace membres, adhésion et gestion des adhésions des OPH.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }

  const port = Number(config.get('PORT') ?? 3000);
  await app.listen(port);
  Logger.log(`API prête : http://localhost:${port}/api/v1  |  Docs : http://localhost:${port}/api/docs`, 'Bootstrap');
}
bootstrap();

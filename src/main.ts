import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { SwaggerDocumentService } from './common/swagger.provider';

const bootstrap = async () => {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      cors: true,
      logger: ['error', 'warn', 'log', 'debug'],
    });
    // Enable class-validator to use NestJS dependency injection
    useContainer(app.select(AppModule), { fallbackOnErrors: true });
    const configService = app.get(ConfigService);
    const port = configService.get('port');
    app.enableCors();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    const config = new DocumentBuilder()
      .setTitle('Al Narcis API')
      .setDescription('API documentation for the Al Narcis project')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    // Write swagger.json to project root folder
    writeFileSync(
      resolve(process.cwd(), 'swagger.json'),
      JSON.stringify(document, null, 2),
    );
    // Set the Swagger document for the DocsController
    const swaggerDocumentService = app.get(SwaggerDocumentService);
    swaggerDocumentService.setDocument(document);

    await app.listen(port, '0.0.0.0', () =>
      console.log(`SERVER STARTED ON PORT: ${port}`),
    );
  } catch (e) {
    console.log('[ERROR]: ', e);
  }
};

bootstrap();

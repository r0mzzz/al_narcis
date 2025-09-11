import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';

const bootstrap = async () => {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      cors: true,
      logger: ['error', 'warn', 'log'],
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
    await app.listen(port, () =>
      console.log(`SERVER STARTED ON PORT: ${port}`),
    );
  } catch (e) {
    console.log('[ERROR]: ', e);
  }
};

bootstrap();

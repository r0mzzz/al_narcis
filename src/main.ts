import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const bootstrap = async () => {
  try {
    const app = await NestFactory.create(AppModule, {
      cors: true,
      logger: ['error', 'warn', 'log'],
    });
    const configService = app.get(ConfigService);
    const port = configService.get('port');
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

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TodoModule } from './modules/todo/todo.module';
import { ConfigModule } from '@nestjs/config';
import configurations from './configuration';
import { AuthModule } from './modules/auth/auth.module';
import * as path from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { FileModule } from './modules/file/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configurations],
    }),
    MongooseModule.forRoot(
      'mongodb+srv://admin:admin12345@cluster0.gbqtupu.mongodb.net/?retryWrites=true&w=majority',
    ),
    TodoModule,
    AuthModule,
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, 'images'),
      serveRoot: '/images',
    }),
    FileModule,
  ],
})
export class AppModule {}

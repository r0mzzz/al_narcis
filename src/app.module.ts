import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TodoModule } from './modules/todo/todo.module';
import { ConfigModule } from '@nestjs/config';
import configurations from './configuration';
import { UserModule } from './modules/user/user.module';
import { TokenModule } from './modules/token/token.module';
import { AuthModule } from './modules/auth/auth.module';

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
    UserModule,
    TokenModule,
    AuthModule,
  ],
})
export class AppModule {}

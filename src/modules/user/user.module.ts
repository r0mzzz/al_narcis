import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './user.controller';
import { User, UserSchema } from './schema/user.schema';
import { Gradation, GradationSchema } from './schema/gradation.schema';
import { UsersService } from './user.service';
import { MinioModule } from '../../services/minio.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Gradation.name, schema: GradationSchema },
    ]),
    MinioModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UserModule {}

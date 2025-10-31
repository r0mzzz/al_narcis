import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './user.controller';
import { User, UserSchema } from './schema/user.schema';
import { Gradation, GradationSchema } from './schema/gradation.schema';
import { UsersService } from './user.service';
import { MinioModule } from '../../services/minio.module';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { Admin, AdminSchema } from '../admin/schema/admin.schema';
import { JwtSharedModule } from '../../services/jwt-shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Gradation.name, schema: GradationSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    MinioModule,
    JwtSharedModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AdminOrUserGuard, AdminAuthGuard, AccessTokenGuard],
  exports: [UsersService],
})
export class UserModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from './schema/banner.schema';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { MinioModule } from '../../services/minio.module';
import { JwtSharedModule } from '../../services/jwt-shared.module';
import { AdminModule } from '../admin/admin.module';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
    MinioModule,
    AdminModule,
    JwtSharedModule,
  ],
  controllers: [BannerController],
  providers: [
    BannerService,
    AdminOrUserGuard,
    // provide guards locally so their DI (JwtService, AdminModel, etc.) can be resolved
    AdminAuthGuard,
    AccessTokenGuard,
  ],
  exports: [BannerService],
})
export class BannerModule {}

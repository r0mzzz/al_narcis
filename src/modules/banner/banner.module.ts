import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Banner, BannerSchema } from './schema/banner.schema';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { MinioModule } from '../../services/minio.module';
import { JwtSharedModule } from '../../services/jwt-shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
    MinioModule,
    JwtSharedModule,
  ],
  controllers: [BannerController],
  providers: [BannerService],
  exports: [BannerService],
})
export class BannerModule {}

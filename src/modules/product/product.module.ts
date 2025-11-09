import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/product.schema';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Capacity, CapacitySchema } from './schema/capacity.schema';
import { CapacityService } from './capacity.service';
import { IsAllowedCapacityConstraint } from './dto/is-allowed-capacity.validator';
import { MinioService } from '../../services/minio.service';
import {
  ProductCategory,
  ProductCategorySchema,
} from './schema/product-category.schema';
import { ProductType, ProductTypeSchema } from './schema/product-type.schema';
import { RedisModule } from '../../services/redis.module';
import { Tag, TagSchema } from './schema/tag.schema';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { GenderService } from './gender.service';
import { JwtSharedModule } from '../../services/jwt-shared.module';
import { AdminModule } from '../admin/admin.module';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { Section, SectionSchema } from './schema/section.schema';
import { MainCategory, MainCategorySchema } from './schema/main-category.schema';
import { SubCategory, SubCategorySchema } from './schema/sub-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Capacity.name, schema: CapacitySchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
      { name: ProductType.name, schema: ProductTypeSchema },
      { name: Tag.name, schema: TagSchema },
      { name: Section.name, schema: SectionSchema },
      { name: MainCategory.name, schema: MainCategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
    ]),
    RedisModule,
    JwtSharedModule,
    AdminModule,
  ],
  controllers: [ProductController, TagController],
  providers: [
    ProductService,
    CapacityService,
    IsAllowedCapacityConstraint,
    MinioService,
    TagService,
    GenderService,
    AdminAuthGuard,
    AccessTokenGuard,
    AdminOrUserGuard,
  ],
  exports: [ProductService],
})
export class ProductModule {}

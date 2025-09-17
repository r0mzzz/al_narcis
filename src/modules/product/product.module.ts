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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Capacity.name, schema: CapacitySchema },
      { name: ProductCategory.name, schema: ProductCategorySchema },
      { name: ProductType.name, schema: ProductTypeSchema },
    ]),
    RedisModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    CapacityService,
    IsAllowedCapacityConstraint,
    MinioService,
  ],
  exports: [ProductService],
})
export class ProductModule {}

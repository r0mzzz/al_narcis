import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/product.schema';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Capacity, CapacitySchema } from './schema/capacity.schema';
import { CapacityService } from './capacity.service';
import { IsAllowedCapacityConstraint } from './dto/is-allowed-capacity.validator';
import { MinioService } from '../../services/minio.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Capacity.name, schema: CapacitySchema },
    ]),
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

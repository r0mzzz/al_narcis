import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cart, CartSchema } from './schema/cart.schema';
import { Discount, DiscountSchema } from './schema/discount.schema';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { MinioModule } from '../../services/minio.module';
import { ProductModule } from '../product/product.module';
import { UserModule } from '../user/user.module';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { Admin, AdminSchema } from '../admin/schema/admin.schema';
import { JwtSharedModule } from '../../services/jwt-shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Discount.name, schema: DiscountSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    MinioModule,
    ProductModule,
    UserModule,
    JwtSharedModule,
  ],
  controllers: [CartController],
  providers: [CartService, AdminOrUserGuard, AdminAuthGuard, AccessTokenGuard],
  exports: [CartService],
})
export class CartModule {}

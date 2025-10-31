import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { Admin, AdminSchema } from '../admin/schema/admin.schema';
import { JwtSharedModule } from '../../services/jwt-shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Admin.name, schema: AdminSchema },
    ]),
    JwtSharedModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, AdminOrUserGuard, AdminAuthGuard, AccessTokenGuard],
  exports: [OrderService],
})
export class OrderModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [OrderController],
  providers: [OrderService, AdminOrUserGuard, AdminAuthGuard, AccessTokenGuard],
  exports: [OrderService],
})
export class OrderModule {}

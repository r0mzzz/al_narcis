import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { User, UserSchema } from '../user/schema/user.schema';
import { PaymentController } from './payment.controller';
import { CashbackModule } from '../cashback/cashback.module';
import { HistoryModule } from '../history/history.module';
import { OrderModule } from '../order/order.module';
import { Discount, DiscountSchema } from '../cart/schema/discount.schema';
import { UserModule } from '../user/user.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Discount.name, schema: DiscountSchema },
    ]),
    UserModule,
    CartModule,
    CashbackModule,
    forwardRef(() => HistoryModule),
    forwardRef(() => OrderModule),
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}

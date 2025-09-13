import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { User, UserSchema } from '../user/schema/user.schema';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}

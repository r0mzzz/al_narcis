import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PaymentHistory,
  PaymentHistorySchema,
} from './schema/payment-history.schema';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { PaymentModule } from '../payment/payment.module';
import { RedisModule } from '../../services/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentHistory.name, schema: PaymentHistorySchema },
    ]),
    forwardRef(() => PaymentModule),
    RedisModule,
  ],
  providers: [HistoryService],
  controllers: [HistoryController],
  exports: [HistoryService],
})
export class HistoryModule {}

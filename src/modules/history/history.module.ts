import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentHistory, PaymentHistorySchema } from './schema/payment-history.schema';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentHistory.name, schema: PaymentHistorySchema },
    ]),
  ],
  providers: [HistoryService],
  controllers: [HistoryController],
  exports: [HistoryService],
})
export class HistoryModule {}


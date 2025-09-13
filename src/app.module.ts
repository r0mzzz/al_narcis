import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configurations from './configuration';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { HistoryModule } from './modules/history/history.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configurations],
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule,
    ProductModule,
    HistoryModule,
    PaymentModule
  ],
})
export class AppModule {}

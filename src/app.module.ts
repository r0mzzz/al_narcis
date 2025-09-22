import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configurations from './configuration';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { HistoryModule } from './modules/history/history.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RedisService } from './services/redis.service';
import { CashbackModule } from './modules/cashback/cashback.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configurations],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb_uri'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ProductModule,
    HistoryModule,
    PaymentModule,
    CashbackModule,
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class AppModule {}

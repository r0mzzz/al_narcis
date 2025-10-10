import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configurations from './configuration';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
import { HistoryModule } from './modules/history/history.module';
import { PaymentModule } from './modules/payment/payment.module';
import { RedisModule } from './services/redis.module';
import { CashbackModule } from './modules/cashback/cashback.module';
import { BrandsModule } from './modules/brands/brands.module';
import { GPModule } from './modules/product/gp/gp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configurations],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    ProductModule,
    HistoryModule,
    PaymentModule,
    CashbackModule,
    RedisModule,
    BrandsModule,
    GPModule,
  ],
})
export class AppModule {}

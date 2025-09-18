import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CashbackConfig,
  CashbackConfigSchema,
} from './schema/cashback-config.schema';
import { CashbackConfigService } from './cashback-config.service';
import { CashbackConfigController } from './cashback-config.controller';
import {
  MainCashbackConfig,
  MainCashbackConfigSchema,
} from './schema/main-cashback-config.schema';
import { MainCashbackConfigService } from './main-cashback-config.service';
import { MainCashbackConfigController } from './main-cashback-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashbackConfig.name, schema: CashbackConfigSchema },
      { name: MainCashbackConfig.name, schema: MainCashbackConfigSchema },
    ]),
  ],
  providers: [CashbackConfigService, MainCashbackConfigService],
  controllers: [CashbackConfigController, MainCashbackConfigController],
  exports: [CashbackConfigService, MainCashbackConfigService],
})
export class CashbackModule {}

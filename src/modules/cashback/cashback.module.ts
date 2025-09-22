import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CashbackController } from './cashback.controller';
import { CashbackService } from './cashback.service';
import { Cashback, CashbackSchema } from './schema/cashback.schema';
import { CashbackConfigService } from './cashback-config.service';
import {
  CashbackConfig,
  CashbackConfigSchema,
} from './schema/cashback-config.schema';
import { MainCashbackConfigService } from './main-cashback-config.service';
import {
  MainCashbackConfig,
  MainCashbackConfigSchema,
} from './schema/main-cashback-config.schema';
import { CashbackConfigController } from './cashback-config.controller';
import { MainCashbackConfigController } from './main-cashback-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cashback.name, schema: CashbackSchema },
      { name: CashbackConfig.name, schema: CashbackConfigSchema },
      { name: MainCashbackConfig.name, schema: MainCashbackConfigSchema },
    ]),
  ],
  controllers: [
    CashbackController,
    CashbackConfigController,
    MainCashbackConfigController,
  ],
  providers: [
    CashbackService,
    CashbackConfigService,
    MainCashbackConfigService,
  ],
  exports: [CashbackService, CashbackConfigService, MainCashbackConfigService],
})
export class CashbackModule {}

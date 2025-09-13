import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CashbackConfig,
  CashbackConfigSchema,
} from './schema/cashback-config.schema';
import { CashbackConfigService } from './cashback-config.service';
import { CashbackConfigController } from './cashback-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashbackConfig.name, schema: CashbackConfigSchema },
    ]),
  ],
  providers: [CashbackConfigService],
  controllers: [CashbackConfigController],
  exports: [CashbackConfigService],
})
export class CashbackModule {}

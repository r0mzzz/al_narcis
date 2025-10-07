import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MainCashbackConfig,
  MainCashbackConfigDocument,
} from './schema/main-cashback-config.schema';

@Injectable()
export class MainCashbackConfigService {
  constructor(
    @InjectModel(MainCashbackConfig.name)
    private mainCashbackConfigModel: Model<MainCashbackConfigDocument>,
  ) {}

  async getConfig(): Promise<MainCashbackConfig> {
    const config = await this.mainCashbackConfigModel.findOne();
    if (!config)
      throw new NotFoundException({
        en: 'Main cashback config not found',
        az: 'Əsas kəşbək konfiqi tapılmadı',
      });
    return config;
  }

  async createConfig(
    data: Partial<MainCashbackConfig>,
  ): Promise<MainCashbackConfig> {
    return this.mainCashbackConfigModel.create(data);
  }

  async updateConfig(
    id: string,
    data: Partial<MainCashbackConfig>,
  ): Promise<MainCashbackConfig> {
    const config = await this.mainCashbackConfigModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );
    if (!config)
      throw new NotFoundException({
        en: 'Main cashback config not found',
        az: 'Əsas kəşbək konfiqi tapılmadı',
      });
    return config;
  }
}

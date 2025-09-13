import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CashbackConfig, CashbackConfigDocument } from './schema/cashback-config.schema';

@Injectable()
export class CashbackConfigService {
  constructor(
    @InjectModel(CashbackConfig.name)
    private cashbackConfigModel: Model<CashbackConfigDocument>,
  ) {}

  async getConfig(): Promise<CashbackConfig> {
    const config = await this.cashbackConfigModel.findOne();
    if (!config) throw new NotFoundException('Cashback config not found');
    return config;
  }

  async createConfig(data: Partial<CashbackConfig>): Promise<CashbackConfig> {
    return this.cashbackConfigModel.create(data);
  }

  async updateConfig(id: string, data: Partial<CashbackConfig>): Promise<CashbackConfig> {
    const config = await this.cashbackConfigModel.findByIdAndUpdate(id, data, { new: true });
    if (!config) throw new NotFoundException('Cashback config not found');
    return config;
  }

  async deleteConfig(id: string): Promise<void> {
    const result = await this.cashbackConfigModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Cashback config not found');
  }
}


import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CashbackConfigService } from './cashback-config.service';
import { CashbackConfig } from './schema/cashback-config.schema';

@Controller('cashback-config')
export class CashbackConfigController {
  constructor(private readonly cashbackConfigService: CashbackConfigService) {}

  @Get()
  async getConfig(): Promise<CashbackConfig> {
    return this.cashbackConfigService.getConfig();
  }

  @Post()
  async createConfig(
    @Body() data: Partial<CashbackConfig>,
  ): Promise<CashbackConfig> {
    return this.cashbackConfigService.createConfig(data);
  }

  @Put(':id')
  async updateConfig(
    @Param('id') id: string,
    @Body() data: Partial<CashbackConfig>,
  ): Promise<CashbackConfig> {
    return this.cashbackConfigService.updateConfig(id, data);
  }

  @Delete(':id')
  async deleteConfig(@Param('id') id: string): Promise<{ message: { en: string; az: string } }> {
    await this.cashbackConfigService.deleteConfig(id);
    return { message: { en: 'Deleted successfully', az: 'Uğurla silindi' } };
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MainCashbackConfigService } from './main-cashback-config.service';
import { MainCashbackConfigDto } from './dto/main-cashback-config.dto';

@Controller('main-cashback-config')
export class MainCashbackConfigController {
  constructor(
    private readonly mainCashbackConfigService: MainCashbackConfigService,
  ) {}

  @Get()
  async getConfig() {
    return this.mainCashbackConfigService.getConfig();
  }

  @Post()
  async createConfig(@Body() dto: MainCashbackConfigDto) {
    return this.mainCashbackConfigService.createConfig(dto);
  }

  @Patch(':id')
  async updateConfig(
    @Param('id') id: string,
    @Body() dto: MainCashbackConfigDto,
  ) {
    return this.mainCashbackConfigService.updateConfig(id, dto);
  }
}

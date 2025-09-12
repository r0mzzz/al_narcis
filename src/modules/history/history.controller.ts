import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { CreatePaymentHistoryDto } from './dto/create-payment-history.dto';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  async create(@Body() body: CreatePaymentHistoryDto) {
    return this.historyService.create(body);
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  async findAll() {
    return this.historyService.findAll();
  }

  @UseGuards(AccessTokenGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.historyService.findByUser(id);
  }
}

import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { CreatePaymentHistoryDto } from './dto/create-payment-history.dto';

@UseGuards(AccessTokenGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Post()
  async create(@Body() body: CreatePaymentHistoryDto) {
    return this.historyService.create(body);
  }

  @Get()
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.historyService.findAll(Number(page), Number(limit));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.historyService.findByUser(id);
  }
}

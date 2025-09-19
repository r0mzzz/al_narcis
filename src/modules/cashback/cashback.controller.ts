import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CashbackService } from './cashback.service';
import { CreateCashbackDto } from './dto/create-cashback.dto';

@Controller('cashback')
export class CashbackController {
  constructor(private readonly cashbackService: CashbackService) {}

  @Post()
  async create(@Body() createCashbackDto: CreateCashbackDto) {
    return this.cashbackService.create(createCashbackDto);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.cashbackService.findByUser(userId);
  }
}

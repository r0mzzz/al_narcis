import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    let pageNum = page ? parseInt(page, 10) : 1;
    let limitNum = limit ? parseInt(limit, 10) : 10;
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
    return this.cashbackService.findByUser(
      userId,
      pageNum,
      limitNum,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }
}

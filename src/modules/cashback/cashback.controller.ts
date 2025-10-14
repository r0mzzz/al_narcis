import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CashbackService } from './cashback.service';
import { CreateCashbackDto } from './dto/create-cashback.dto';
import { FindCashbackByUserQueryDto } from './dto/find-cashback-by-user-query.dto';
import { ValidationPipe } from '@nestjs/common';

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
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: FindCashbackByUserQueryDto,
  ) {
    return this.cashbackService.findByUser(
      userId,
      query.page,
      query.limit,
      query.fromDate,
      query.toDate,
    );
  }
}

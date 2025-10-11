import { Controller, Get, Post, Body } from '@nestjs/common';
import { GPService } from './gp.service';
import { GetPaymentKeyDto } from './dto/get-payment-key.dto';
import { GetPaymentResultDto } from './dto/get-payment-result.dto';

@Controller('gp')
export class GPController {
  constructor(private readonly gpService: GPService) {}

  @Get('hello')
  getHello(): string {
    return this.gpService.getHello();
  }

  @Post('getPaymentKey')
  async getPaymentKey(@Body() dto: GetPaymentKeyDto) {
    return this.gpService.getPaymentKey(dto);
  }

  @Post('getPaymentResult')
  async getPaymentResult(@Body() dto: GetPaymentResultDto) {
    return this.gpService.getPaymentResult(dto.paymentKey);
  }
}

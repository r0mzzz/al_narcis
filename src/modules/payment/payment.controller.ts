import {
  Body,
  Controller,
  Logger,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CalculateCashbackDto } from './dto/calculate-cashback.dto';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@UseGuards(AccessTokenGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Calculate and distribute cashback for a purchase.
   * Body: { amount: number, user_id: string }
   */
  @Post('cashback')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async calculateCashback(@Body() dto: CalculateCashbackDto) {
    let cashbackError = null;
    try {
      await this.paymentService.calculateCashback(dto);
    } catch (error) {
      Logger.error(
        'Cashback calculation failed',
        error.stack,
        'PaymentController',
      );
      cashbackError = error.message || 'Unknown cashback error';
    }
    return {
      message: {
        en: 'Cashback calculated (if eligible)',
        az: 'Kəşbək hesablandı (əgər uyğundursa)',
      },
      ...(cashbackError ? { cashbackError } : {}),
    };
  }

  /**
   * Pay for an order.
   * Body: { orderId: string, paymentMethod: string, ... }
   */
  @Post('pay')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async pay(@Body() dto: CreateOrderDto) {
    return this.paymentService.pay(dto);
  }
}

import { Body, Controller, Logger, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CalculateCashbackDto } from './dto/calculate-cashback.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Calculate and distribute cashback for a purchase.
   * Body: { amount: number, user_id: string }
   */
  @Post('cashback')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async calculateCashback(
    @Body() dto: CalculateCashbackDto,
  ) {
    const { amount, user_id, paymentKey } = dto;
    let cashbackError = null;
    try {
      await this.paymentService.calculateCashback(amount, user_id, paymentKey);
    } catch (error) {
      Logger.error(
        'Cashback calculation failed',
        error.stack,
        'PaymentController',
      );
      cashbackError = error.message || 'Unknown cashback error';
    }
    return {
      message: 'Cashback calculated (if eligible)',
      ...(cashbackError ? { cashbackError } : {}),
    };
  }
}

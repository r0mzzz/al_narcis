import { Body, Controller, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Calculate and distribute cashback for a purchase.
   * Body: { amount: number, user_id: string }
   */
  @Post('cashback')
  async calculateCashback(
    @Body('amount') amount: number,
    @Body('user_id') userId: string,
    @Body('paymentKey') paymentKey: string,
  ) {
    if (!userId) {
      return { message: 'user_id is required in body' };
    }
    await this.paymentService.calculateCashback(amount, userId, paymentKey);
    return { message: 'Cashback calculated (if eligible)' };
  }
}

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { GetPaymentKeyDto } from './dto/get-payment-key.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GPService {
  private readonly logger = new Logger(GPService.name);

  constructor(private readonly httpService: HttpService) {}

  async getPaymentKey(dto: GetPaymentKeyDto): Promise<{ paymentKey: string }> {
    try {
      const url = 'https://rest-pg.goldenpay.az/getPaymentKey';
      const response = await firstValueFrom(
        this.httpService.post(url, dto, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      if (response.data?.status?.code === 1 && response.data?.paymentKey) {
        return { paymentKey: response.data.paymentKey };
      }
      this.logger.error('GoldenPay error response', response.data);
      throw new HttpException(
        response.data || 'GoldenPay request failed',
        HttpStatus.BAD_GATEWAY,
      );
    } catch (error) {
      this.logger.error('GoldenPay request failed', error);
      throw new HttpException(
        error?.response?.data || 'GoldenPay request failed',
        error?.response?.status || HttpStatus.BAD_GATEWAY,
      );
    }
  }

  getHello(): string {
    return 'Hello from GPService!';
  }

  // Example: Add another method for future extension
  async checkPaymentStatus(paymentKey: string): Promise<any> {
    // Implement actual logic as needed
    return { status: 'NOT_IMPLEMENTED', paymentKey };
  }
}

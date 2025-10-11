import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { GetPaymentKeyDto } from './dto/get-payment-key.dto';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class GPService {
  private readonly logger = new Logger(GPService.name);
  private readonly authKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // this.authKey = this.configService.get<string>('goldenpay.authKey');
    this.authKey = 'e7ea68e88b504e60b4c4fc7acb7e2990';
  }

  async getPaymentKey(
    dto: GetPaymentKeyDto,
  ): Promise<{ paymentKey: string; paymentUrl: string }> {
    try {
      const url = 'https://rest-pg.goldenpay.az/getPaymentKey';
      // Set defaults for lang and redirectUrl if not provided
      const lang = dto.lang ?? 'az';
      const redirectUrl = dto.redirectUrl ?? 'https://www.alnarcis.az';
      // Generate hashCode using MD5(authKey + merchantName + cardType + amount + description)
      const hashString =
        this.authKey +
        dto.merchantName +
        dto.cardType +
        dto.amount +
        dto.description;
      const hashCode = crypto
        .createHash('md5')
        .update(hashString, 'utf-8')
        .digest('hex');
      this.logger.log('Generated hashCode: ' + hashCode);
      const payload = {
        merchantName: dto.merchantName,
        cardType: dto.cardType,
        lang,
        amount: dto.amount,
        description: dto.description,
        redirectUrl,
        hashCode,
      };
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      if (response.data?.status?.code === 1 && response.data?.paymentKey) {
        return {
          paymentKey: response.data.paymentKey,
          paymentUrl: `https://rest-pg.goldenpay.az/pay/${response.data.paymentKey}`,
        };
      }
      this.logger.error('GoldenPay error response', response.data);
      // Return the error message and code from GoldenPay to the user with a valid HTTP status
      throw new HttpException(
        {
          message: response.data?.status?.message || 'GoldenPay request failed',
          code: response.data?.status?.code,
        },
        HttpStatus.BAD_REQUEST,
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

  async checkPaymentStatus(paymentKey: string): Promise<any> {
    return { status: 'NOT_IMPLEMENTED', paymentKey };
  }

  async getPaymentResult(paymentKey: string): Promise<any> {
    try {
      const url = 'https://rest-pg.goldenpay.az/getPaymentResult';
      const hashString = this.authKey + paymentKey;
      const hashCode = crypto
        .createHash('md5')
        .update(hashString, 'utf-8')
        .digest('hex');
      this.logger.log(`Generated hashCode for payment result: ${hashCode}`);
      const params = new URLSearchParams({
        payment_key: paymentKey,
        hash_code: hashCode,
      });
      const response = await firstValueFrom(
        this.httpService.get(`${url}?${params.toString()}`),
      );
      // Always return the full GoldenPay response, success or error
      return response.data;
    } catch (error) {
      this.logger.error('GoldenPay request failed', error);
      // If GoldenPay returned a response, return it (success or error) to the user
      if (error?.response?.data) {
        return error.response.data;
      }
      // Otherwise, throw a generic error
      throw new HttpException(
        'GoldenPay request failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

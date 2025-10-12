import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { GPService } from './gp.service';
import { GetPaymentKeyDto } from './dto/get-payment-key.dto';
import { GetPaymentResultDto } from './dto/get-payment-result.dto';

@ApiTags('GoldenPay')
@Controller('gp')
export class GPController {
  constructor(private readonly gpService: GPService) {}

  @Get('hello')
  @ApiOperation({
    summary: 'Test endpoint',
    description: 'Returns hello from GPService.',
  })
  @ApiResponse({ status: 200, schema: { example: 'Hello from GPService!' } })
  getHello(): string {
    return this.gpService.getHello();
  }

  @Post('getPaymentKey')
  @ApiOperation({
    summary: 'Get GoldenPay Payment Key',
    description: 'Request a payment key from GoldenPay.',
  })
  @ApiBody({
    type: GetPaymentKeyDto,
    examples: {
      default: {
        value: {
          merchantName: 'alnarcis',
          cardType: 'v',
          amount: '100',
          description: 'alnarcis_product',
          lang: 'az',
          redirectUrl: 'https://www.alnarcis.az',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        paymentKey: 'e93585e2-426d-440a-ae54-67bd20d362be',
        paymentUrl:
          'https://rest-pg.goldenpay.az/pay/e93585e2-426d-440a-ae54-67bd20d362be',
      },
    },
  })
  @ApiResponse({
    status: 400,
    schema: {
      example: {
        message: 'GoldenPay request failed',
        code: 803,
      },
    },
  })
  async getPaymentKey(@Body() dto: GetPaymentKeyDto) {
    return this.gpService.getPaymentKey(dto);
  }

  @Post('getPaymentResult')
  @ApiOperation({
    summary: 'Get GoldenPay Payment Result',
    description: 'Check payment result from GoldenPay.',
  })
  @ApiBody({
    type: GetPaymentResultDto,
    examples: {
      default: {
        value: {
          paymentKey: 'e93585e2-426d-440a-ae54-67bd20d362be',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        status: { code: 1, message: 'success' },
        paymentKey: 'e93585e2-426d-440a-ae54-67bd20d362be',
        merchantName: 'test',
        amount: 100,
        checkCount: 1,
        paymentDate: '2014-08-01 14:16:58',
        cardNumber: '402865******8101',
        language: 'az',
        description: null,
        rrn: '421314397359',
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        status: {
          code: 816,
          message: 'Payment failed- Message from payment system [code= 816 ]',
        },
        paymentKey: '1e29132f-8658-4d45-9eb6-f9428835bb2c',
        merchantName: 'alnarcis',
        amount: 1,
        checkCount: 2,
        paymentDate: '2025-10-12 00:10:45',
        cardNumber: '4127XXXXXXXX3890',
        language: 'az',
        description: 'alnarcis_product',
        rrn: 'null',
      },
    },
  })
  async getPaymentResult(@Body() dto: GetPaymentResultDto) {
    return this.gpService.getPaymentResult(dto.paymentKey);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetPaymentResultDto {
  @ApiProperty({
    example: 'e93585e2-426d-440a-ae54-67bd20d362be',
    description: 'GoldenPay payment key',
  })
  @IsString()
  paymentKey: string;
}

import { IsString } from 'class-validator';

export class GetPaymentResultDto {
  @IsString()
  paymentKey: string;
}


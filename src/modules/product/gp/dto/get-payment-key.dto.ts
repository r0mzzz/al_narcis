import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class GetPaymentKeyDto {
  @IsString()
  merchantName: string;

  @IsString()
  cardType: string;

  @IsString()
  hashCode: string;

  @IsString()
  lang: string;

  @IsNumberString()
  amount: string;

  @IsString()
  description: string;

  @IsOptional()
  redirectUrl?: string | null;
}


import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class GetPaymentKeyDto {
  @IsString()
  merchantName: string;

  @IsString()
  cardType: string;

  @IsOptional()
  @IsString()
  lang?: string; // Optional, default to 'az' in service

  @IsNumberString()
  amount: string;

  @IsString()
  description: string;

  @IsOptional()
  redirectUrl?: string | null; // Optional, default to null in service
}

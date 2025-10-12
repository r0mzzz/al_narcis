import { IsString, IsOptional, IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetPaymentKeyDto {
  @ApiProperty({ example: 'alnarcis', description: 'Merchant name registered in GoldenPay' })
  @IsString()
  merchantName: string;

  @ApiProperty({ example: 'v', description: 'Card type (v for Visa, m for MasterCard, etc.)' })
  @IsString()
  cardType: string;

  @ApiProperty({ example: 'az', required: false, description: 'Language code, defaults to az' })
  @IsOptional()
  @IsString()
  lang?: string; // Optional, default to 'az' in service

  @ApiProperty({ example: '100', description: 'Amount to pay as string' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ example: 'alnarcis_product', description: 'Payment description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://www.alnarcis.az', required: false, description: 'Redirect URL after payment, optional' })
  @IsOptional()
  redirectUrl?: string | null; // Optional, default to null in service
}

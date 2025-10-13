import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CashbackType } from '../schema/cashback.schema';

export class CreateCashbackDto {
  @ApiProperty({ example: 'REFERRAL', description: 'Type of cashback (enum)' })
  @IsEnum(CashbackType)
  cashbackType: CashbackType;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    description: 'User ID (MongoDB ObjectId)',
  })
  @IsMongoId()
  user_id: string;

  @ApiProperty({ example: 100, description: 'Amount of cashback' })
  @IsNumber()
  cashbackAmount: number;

  @ApiProperty({
    example: '2025-10-12T00:00:00.000Z',
    description: 'Date of cashback',
  })
  @IsNotEmpty()
  date: String;

  @ApiProperty({
    example: 'e93585e2-426d-440a-ae54-67bd20d362be',
    description: 'GoldenPay payment key',
  })
  @IsString()
  paymentKey: string;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c86',
    description: 'Referrer user ID (MongoDB ObjectId)',
  })
  @IsMongoId()
  from_user_id: string;

  @ApiProperty({ example: 1000, description: 'Original payment amount' })
  @IsNumber()
  paymentAmount: number;
}

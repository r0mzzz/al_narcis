import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsString, IsNotEmpty } from 'class-validator';

export class CalculateCashbackDto {
  @ApiProperty({ example: 100, description: 'Amount to calculate cashback for' })
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(1, { message: 'amount must be positive' })
  amount: number;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', description: 'User ID (MongoDB ObjectId)' })
  @IsString({ message: 'user_id must be a string' })
  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;

  @ApiProperty({ example: 'e93585e2-426d-440a-ae54-67bd20d362be', description: 'GoldenPay payment key' })
  @IsString({ message: 'paymentKey must be a string' })
  @IsNotEmpty({ message: 'paymentKey is required' })
  paymentKey: string;

  @ApiProperty({ example: '2023-10-10', description: 'Date of the transaction' })
  @IsString({ message: 'date must be a string' })
  @IsNotEmpty({ message: 'date is required' })
  date: string;
}

import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreatePaymentHistoryDto {
  @IsNotEmpty({ message: 'amount is required' })
  @IsNumber({}, { message: 'amount must be a number' })
  amount: number;

  @IsNotEmpty({ message: 'status is required' })
  @IsString({ message: 'status must be a string' })
  status: string;

  @IsNotEmpty({ message: 'productId is required' })
  @IsString({ message: 'productId must be a string' })
  productId: string;

  @IsNotEmpty({ message: 'userId is required' })
  @IsString({ message: 'userId must be a string' })
  userId: string;

  @IsNotEmpty({ message: 'productName is required' })
  @IsString({ message: 'productName must be a string' })
  productName: string;
}

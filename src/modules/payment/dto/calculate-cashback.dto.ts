import { IsNumber, Min, IsString, IsNotEmpty } from 'class-validator';

export class CalculateCashbackDto {
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(1, { message: 'amount must be positive' })
  amount: number;

  @IsString({ message: 'user_id must be a string' })
  @IsNotEmpty({ message: 'user_id is required' })
  user_id: string;

  @IsString({ message: 'paymentKey must be a string' })
  @IsNotEmpty({ message: 'paymentKey is required' })
  paymentKey: string;
}


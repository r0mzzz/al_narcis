import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn } from 'class-validator';

export class UpdateCartItemCountDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  capacity: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsOptional()
  _id?: string;

  @IsIn(['increment', 'decrement'])
  operation: 'increment' | 'decrement';

  @IsNumber()
  @IsOptional()
  delta?: number; // Optional, default 1
}


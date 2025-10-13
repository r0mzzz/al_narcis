import {
  IsEnum,
  IsObject,
  IsString,
  IsNumber,
} from 'class-validator';
import { OrderStatus } from '../order-status.enum';

export class CreateOrderDto {
  @IsObject()
  status: { code: number; message: string };

  @IsString()
  paymentKey: string;

  @IsString()
  merchantName: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  checkCount: number;

  @IsString()
  paymentDate: string;

  @IsString()
  cardNumber: string;

  @IsString()
  language: string;

  @IsString()
  description: string;

  @IsString()
  rrn: string;

  @IsString()
  user_id: string;

  @IsString()
  phoneNumber: string;

  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;
}

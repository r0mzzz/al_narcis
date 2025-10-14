import {
  IsEnum,
  IsObject,
  IsString,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOrderDto)
  products: ProductOrderDto[];

  @IsString()
  deliveryAddress: string;
}

export class ProductOrderDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsString()
  variant: string;

  @IsNumber()
  count: number;
}

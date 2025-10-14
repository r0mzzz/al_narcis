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
import { ApiProperty } from '@nestjs/swagger';

export class ProductOrderDto {
  @ApiProperty({ example: 'productId123' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'Product Name' })
  @IsString()
  productName: string;

  @ApiProperty({ example: 'variant1' })
  @IsString()
  variant: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  count: number;
}


export class CreateOrderDto {
  @ApiProperty({ type: Object, example: { code: 1, message: 'success' } })
  @IsObject()
  status: { code: number; message: string };

  @ApiProperty({ example: '2e7fea79-4714-42c4-86cf-3fb21683f71d' })
  @IsString()
  paymentKey: string;

  @ApiProperty({ example: 'alnarcis' })
  @IsString()
  merchantName: string;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  checkCount: number;

  @ApiProperty({ example: '2025-10-12 00:41:44' })
  @IsString()
  paymentDate: string;

  @ApiProperty({ example: '4098XXXXXXXX5411' })
  @IsString()
  cardNumber: string;

  @ApiProperty({ example: 'az' })
  @IsString()
  language: string;

  @ApiProperty({ example: 'alnarcis_product' })
  @IsString()
  description: string;

  @ApiProperty({ example: '528576075777' })
  @IsString()
  rrn: string;

  @ApiProperty({ example: '38bcc2fb-d6b8-4336-888e-504fd6ac9749' })
  @IsString()
  user_id: string;

  @ApiProperty({ example: '+994559506330' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.WAITING })
  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;

  @ApiProperty({ type: [ProductOrderDto], example: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOrderDto)
  products: ProductOrderDto[];

  @ApiProperty({ example: 'Baku, Nizami street 1' })
  @IsString()
  deliveryAddress: string;
}


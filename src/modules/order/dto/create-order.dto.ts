import {
  IsEnum,
  IsObject,
  IsString,
  IsNumber,
  ValidateNested,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantOrderDto {
  @ApiProperty({ example: 30 })
  @IsNumber()
  capacity: number;

  @ApiProperty({ example: 45 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: '690096095f53cba1687bf1ab' })
  @IsString()
  _id: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  count: number;

  @ApiProperty({ example: 45 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 45 })
  @IsNumber()
  lineTotal: number;
}

export class ProductOrderDto {
  @ApiProperty({ example: 'productId123' })
  @IsString()
  productId: string;

  @ApiProperty({ type: [ProductVariantOrderDto], example: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantOrderDto)
  variants: ProductVariantOrderDto[];

  @ApiProperty({ example: 'Product Name' })
  @IsString()
  productName: string;

  @ApiProperty({ example: 'Product Description' })
  @IsString()
  productDesc: string;

  @ApiProperty({
    example:
      '/product-images/products/690096095f53cba1687bf1aa.jpg?expiry=3600',
  })
  @IsString()
  productImage: string;

  @ApiProperty({ example: 'parfume' })
  @IsString()
  productType: string;

  @ApiProperty({ example: ['EMPTY'] })
  @IsArray()
  @IsString({ each: true })
  category: string[];

  @ApiProperty({ example: 'UNISEX' })
  @IsString()
  gender: string;

  @ApiProperty({ example: 'Montale' })
  @IsString()
  brand: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: Object, example: { code: 1, message: 'success' } })
  @IsObject()
  status: { code: number; message: string };

  @ApiProperty({
    example: '2e7fea79-4714-42c4-86cf-3fb21683f71d',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentKey: string | null;

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

  @ApiProperty({ example: '4098XXXXXXXX5411', nullable: true, required: false })
  @IsOptional()
  @IsString()
  cardNumber: string | null;

  @ApiProperty({ example: 'az' })
  @IsString()
  language: string;

  @ApiProperty({ example: 'alnarcis_product' })
  @IsString()
  description: string;

  @ApiProperty({ example: '528576075777', nullable: true, required: false })
  @IsOptional()
  @IsString()
  rrn: string | null;

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

  @ApiProperty({
    example: 0,
    required: false,
    description: 'Cashback amount used in payment (in coins)',
  })
  @IsOptional()
  @IsNumber()
  usedCashbackAmount?: number;
}

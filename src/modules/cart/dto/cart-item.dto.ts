import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class ProductVariantDto {
  @ApiProperty()
  @IsNumber()
  capacity: number;

  @ApiProperty()
  @IsNumber()
  price: number;
}

export class CartItemDto {
  @ApiProperty()
  @IsString()
  _id: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ type: [ProductVariantDto] })
  @IsArray()
  variants: ProductVariantDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  count?: number; // quantity of this product+size

  /**
   * @deprecated Use count instead
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productDesc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  category?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productImage?: string;

  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  size?: string; // selected variant/capacity
}

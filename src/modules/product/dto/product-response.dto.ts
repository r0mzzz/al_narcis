import { ApiProperty } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiProperty()
  capacity: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  _id: string;
}

export class ProductResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty({ type: [ProductVariantDto] })
  variants: ProductVariantDto[];

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productDesc: string;

  @ApiProperty()
  productImage: string;

  @ApiProperty()
  productType: string;

  @ApiProperty({ type: [String] })
  category: string[];

  @ApiProperty()
  gender: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  brand_id: string;
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  // Add pagination fields if needed
}

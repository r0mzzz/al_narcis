import { IsOptional, IsString, IsArray, ArrayUnique, ValidateNested, Min, IsNumber, IsIn, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Gender } from '../../../common/genre.enum';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_CAPACITIES = [30, 50, 100];

class VariantDto {
  @ApiProperty({ example: 100, required: false, description: 'Product capacity (ml)' })
  @IsOptional()
  @IsNumber()
  @IsIn(ALLOWED_CAPACITIES)
  @Transform(({ value }) => Number(value))
  capacity?: number;

  @ApiProperty({ example: 25, required: false, description: 'Product price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price?: number;
}

export class UpdateProductDto {
  @ApiProperty({ example: 'https://example.com/image.jpg', required: false, description: 'Product image URL' })
  @IsOptional()
  @IsString()
  productImage?: string;

  @ApiProperty({ example: 'Perfume X', required: false, description: 'Product name' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 'A great perfume', required: false, description: 'Product description' })
  @IsOptional()
  @IsString()
  productDesc?: string;

  @ApiProperty({ example: 'perfume', required: false, description: 'Product type' })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiProperty({ example: ['fragrance', 'luxury'], required: false, description: 'Product categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category?: string[];

  @ApiProperty({ type: [VariantDto], required: false, description: 'Product variants' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @ArrayUnique((o: VariantDto) => o.capacity)
  variants?: VariantDto[];

  @ApiProperty({ example: 10, required: false, description: 'Product quantity' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({ example: 'WOMAN', enum: Gender, required: false, description: 'Product gender' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ example: 'Chanel', required: false, description: 'Brand name' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', required: false, description: 'Brand ID (MongoDB ObjectId)' })
  @IsOptional()
  @IsString()
  brand_id?: string;

  @ApiProperty({ example: ['new', 'sale'], required: false, description: 'Product tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

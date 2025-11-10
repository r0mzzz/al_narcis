import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsString,
  ValidateNested,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsAllowedCapacity } from './is-allowed-capacity.validator';
import { Gender } from '../../../common/genre.enum';
import { ApiProperty } from '@nestjs/swagger';

class VariantDto {
  @ApiProperty({ example: 100, description: 'Product capacity (ml)' })
  @IsNotEmpty()
  @IsNumber()
  @IsAllowedCapacity({ message: 'Tutum ($value) icazə verilmir.' })
  @Transform(({ value }) => Number(value))
  capacity: number;

  @ApiProperty({ example: 25, description: 'Product price' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Perfume X', description: 'Product name' })
  @IsNotEmpty()
  @IsString()
  productName: string;

  @ApiProperty({
    example: 'A great perfume',
    required: false,
    description: 'Product description',
  })
  @IsString()
  @IsOptional()
  productDesc?: string;

  @ApiProperty({ type: [VariantDto], description: 'Product variants' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @ArrayUnique((o: VariantDto) => o.capacity)
  variants: VariantDto[];

  @ApiProperty({
    example: 10,
    required: false,
    description: 'Product quantity',
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    required: false,
    description: 'Product image URL',
  })
  @IsOptional()
  @IsString()
  productImage?: string;

  @ApiProperty({
    example: 'perfume',
    required: false,
    description: 'Product type',
  })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiProperty({
    example: ['fragrance', 'luxury'],
    description: 'Product categories',
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  category: string[];

  @ApiProperty({
    example: 'WOMAN',
    enum: Gender,
    description: 'Product gender',
  })
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({
    example: 'Chanel',
    required: false,
    description: 'Brand name',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c85',
    required: false,
    description: 'Brand ID (MongoDB ObjectId)',
  })
  @IsOptional()
  @IsString()
  brand_id?: string;

  @ApiProperty({
    example: ['new', 'sale'],
    required: false,
    description: 'Product tags',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Product status (0=inactive, 1=active)',
  })
  @IsOptional()
  @IsIn([0, 1])
  status?: number;
}

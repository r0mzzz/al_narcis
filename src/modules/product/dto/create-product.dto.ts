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
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsAllowedCapacity } from './is-allowed-capacity.validator';
import { Gender } from '../../../common/genre.enum';

class VariantDto {
  @IsNotEmpty()
  @IsNumber()
  @IsAllowedCapacity({ message: 'Capacity ($value) is not allowed.' })
  @Transform(({ value }) => Number(value))
  capacity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price: number;
}

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsString()
  @IsOptional()
  productDesc?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @ArrayUnique((o: VariantDto) => o.capacity)
  variants: VariantDto[];

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsNotEmpty()
  @IsString()
  productType: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  category: string[];

  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  brand_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsIn,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const ALLOWED_CAPACITIES = [30, 50, 100];

class VariantDto {
  @IsNotEmpty()
  @IsNumber()
  @IsIn(ALLOWED_CAPACITIES)
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
}

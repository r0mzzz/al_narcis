import { IsOptional, IsString, IsArray, ArrayUnique, ValidateNested, Min, IsNumber, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

const ALLOWED_CAPACITIES = [30, 50, 100];

class VariantDto {
  @IsOptional()
  @IsNumber()
  @IsIn(ALLOWED_CAPACITIES)
  @Transform(({ value }) => Number(value))
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  price?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  productImage?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productDesc?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @ArrayUnique((o: VariantDto) => o.capacity)
  variants?: VariantDto[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  quantity?: number;
}

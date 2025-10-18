import {
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { DiscountType } from '../schema/discount.schema';

export class CreateDiscountDto {
  @IsEnum(DiscountType)
  type: DiscountType;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number; // minimum cart subtotal required for this discount (AZN)

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

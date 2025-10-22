import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Prop } from '@nestjs/mongoose';

export class CreateGradationDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  minReferrals: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationDays?: number | null;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateGradationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minReferrals?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationDays?: number | null;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Min(0)
  @IsNumber()
  minAmount?: number; // minimum cart subtotal required for this discount (AZN)

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

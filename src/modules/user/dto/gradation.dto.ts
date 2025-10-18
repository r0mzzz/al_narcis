import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

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
  @IsBoolean()
  active?: boolean;
}

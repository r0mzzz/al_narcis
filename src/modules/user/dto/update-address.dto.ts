import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}


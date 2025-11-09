import { IsString, IsNumber } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  headerTitle: string;

  @IsString()
  orientation: string;

  @IsNumber()
  limit: number;

  @IsString()
  categoryName: string;

  @IsString()
  productType: string;

  @IsNumber()
  maxRows: number;
}

export class UpdateSectionDto {
  @IsString()
  headerTitle?: string;

  @IsString()
  orientation?: string;

  @IsNumber()
  limit?: number;

  @IsString()
  categoryName?: string;

  @IsString()
  productType?: string;

  @IsNumber()
  maxRows?: number;
}

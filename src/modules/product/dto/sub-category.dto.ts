import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  subCategoryName: string;

  @IsString()
  @IsNotEmpty()
  mainCategoryId: string;
}

export class UpdateSubCategoryDto {
  @IsOptional()
  @IsString()
  subCategoryName?: string;

  @IsOptional()
  @IsString()
  mainCategoryId?: string;
}

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMainCategoryDto {
  @IsString()
  @IsNotEmpty()
  mainCategoryName: string;
}

export class UpdateMainCategoryDto {
  @IsOptional()
  @IsString()
  mainCategoryName?: string;
}

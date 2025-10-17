import { IsOptional, IsString } from 'class-validator';

export class CreateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;
}


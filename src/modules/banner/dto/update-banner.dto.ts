import { IsOptional, IsString } from 'class-validator';

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  link?: string;
}

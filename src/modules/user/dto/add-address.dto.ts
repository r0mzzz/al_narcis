import { IsString, IsBoolean } from 'class-validator';

export class AddAddressDto {
  @IsString()
  address: string;

  @IsBoolean()
  isFavorite: boolean;
}


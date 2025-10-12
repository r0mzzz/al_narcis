import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class AddAddressDto {
  @ApiProperty({ example: '123 Main St', description: 'User address' })
  @IsString()
  address: string;

  @ApiProperty({ example: true, description: 'Is this the favorite address?' })
  @IsBoolean()
  isFavorite: boolean;
}

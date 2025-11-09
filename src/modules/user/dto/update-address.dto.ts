import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateAddressDto {
  @ApiProperty({
    example: '123 Main St',
    required: false,
    description: 'User address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Is this the favorite address?',
  })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}

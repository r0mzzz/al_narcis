import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Nike', description: 'Brand name' })
  @IsString()
  name: string;
}

export class UpdateBrandDto {
  @ApiProperty({
    example: 'Adidas',
    description: 'Brand name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}

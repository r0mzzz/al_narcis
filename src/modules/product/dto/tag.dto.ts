import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'new', description: 'Tag name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateTagDto {
  @ApiProperty({ example: 'sale', description: 'Tag name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

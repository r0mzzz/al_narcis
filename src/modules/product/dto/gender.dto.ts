import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export enum GenderCode {
  M = 'M',
  W = 'W',
  U = 'U',
}

export enum GenderType {
  MAN = 'MAN',
  WOMAN = 'WOMAN',
  UNISEX = 'UNISEX',
}

export class CreateGenderDto {
  @ApiProperty({ example: 'WOMAN', enum: GenderType, description: 'Gender type' })
  @IsEnum(GenderType)
  type: GenderType;

  @ApiProperty({ example: 'W', enum: GenderCode, description: 'Gender code' })
  @IsEnum(GenderCode)
  code: GenderCode;
}

export class UpdateGenderDto {
  @ApiProperty({ example: 'MAN', enum: GenderType, required: false, description: 'Gender type' })
  @IsOptional()
  @IsEnum(GenderType)
  type?: GenderType;

  @ApiProperty({ example: 'M', enum: GenderCode, required: false, description: 'Gender code' })
  @IsOptional()
  @IsEnum(GenderCode)
  code?: GenderCode;
}

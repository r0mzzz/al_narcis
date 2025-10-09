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
  @IsEnum(GenderType)
  type: GenderType;

  @IsEnum(GenderCode)
  code: GenderCode;
}

export class UpdateGenderDto {
  @IsOptional()
  @IsEnum(GenderType)
  type?: GenderType;

  @IsOptional()
  @IsEnum(GenderCode)
  code?: GenderCode;
}

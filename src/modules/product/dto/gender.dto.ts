import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

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

const GenderNameMap: Record<GenderCode, string> = {
  [GenderCode.M]: 'Kişi',
  [GenderCode.W]: 'Qadın',
  [GenderCode.U]: 'Unisex',
};

export class CreateGenderDto {
  @ApiProperty({
    example: 'WOMAN',
    enum: GenderType,
    description: 'Gender type',
  })
  @IsEnum(GenderType)
  type: GenderType;

  @ApiProperty({ example: 'W', enum: GenderCode, description: 'Gender code' })
  @IsEnum(GenderCode)
  code: GenderCode;

  @ApiProperty({ example: 'Qadın', description: 'Gender name', readOnly: true })
  get name(): string {
    return GenderNameMap[this.code];
  }
}

export class UpdateGenderDto {
  @ApiProperty({
    example: 'MAN',
    enum: GenderType,
    required: false,
    description: 'Gender type',
  })
  @IsOptional()
  @IsEnum(GenderType)
  type?: GenderType;

  @ApiProperty({
    example: 'M',
    enum: GenderCode,
    required: false,
    description: 'Gender code',
  })
  @IsOptional()
  @IsEnum(GenderCode)
  code?: GenderCode;

  @ApiProperty({
    example: 'Kişi',
    description: 'Gender name',
    readOnly: true,
    required: false,
  })
  get name(): string | undefined {
    if (this.code) {
      return GenderNameMap[this.code];
    }
    return undefined;
  }
}

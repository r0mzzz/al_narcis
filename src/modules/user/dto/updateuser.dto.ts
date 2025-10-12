import {
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../../../common/account-type.enum';
import { AddressDto } from './user.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false, description: 'First name' })
  @IsString()
  readonly first_name?: string;

  @ApiProperty({ example: 'Doe', required: false, description: 'Last name' })
  @IsString()
  readonly last_name?: string;

  @ApiProperty({
    example: '+994501234567',
    required: false,
    description: 'Mobile number',
  })
  @IsString()
  readonly mobile?: string;

  @ApiProperty({
    example: 'USER',
    enum: AccountType,
    required: false,
    description: 'Account type',
  })
  @IsEnum(AccountType)
  readonly accountType?: AccountType;

  @ApiProperty({
    example: 'REF123',
    required: false,
    description: 'Referral code',
  })
  @IsOptional()
  @IsString()
  readonly referralCode?: string;

  @ApiProperty({
    example: 'refresh_token_value',
    required: false,
    description: 'Refresh token',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiProperty({
    example: 'newpassword',
    required: false,
    description: 'User password',
  })
  @IsOptional()
  @IsString()
  readonly password?: string;

  @ApiProperty({
    example: '123456',
    required: false,
    description: 'Reset OTP',
  })
  @IsOptional()
  @IsString()
  readonly resetOtp?: string;

  @ApiProperty({
    example: '2025-10-12T00:00:00.000Z',
    required: false,
    description: 'Reset OTP expiration date',
  })
  @IsOptional()
  readonly resetOtpExpires?: Date;

  @ApiProperty({
    type: [AddressDto],
    required: false,
    description: 'List of user addresses',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}

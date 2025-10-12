import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { AppError } from '../../../common/errors';
import { randomUUID } from 'crypto';
import { AccountType } from '../../../common/account-type.enum';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({ example: '123 Main St', description: 'User address' })
  @IsString()
  address: string;

  @ApiProperty({ example: true, description: 'Is this the favorite address?' })
  @IsBoolean()
  isFavorite: boolean;
}

export class CreateUserDto {
  constructor() {
    this.user_id = randomUUID();
  }

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsNotEmpty()
  @IsString()
  readonly first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsNotEmpty()
  @IsString()
  readonly last_name: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: AppError.PASSWORD_PATTERN_MATCH.az,
    },
  )
  password: string;

  @ApiProperty({ example: '+994501234567', description: 'Mobile number' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+994\d{9}$/, {
    message: 'Mobil nömrə +994XXXXXXXXX formatında olmalıdır',
  })
  readonly mobile: string;

  @ApiProperty({
    example: 'REF123',
    required: false,
    description: 'Referral code',
  })
  @IsOptional()
  @IsString()
  readonly referralCode?: string;

  @ApiProperty({
    example: 'USER',
    enum: AccountType,
    description: 'Account type',
  })
  @IsNotEmpty()
  @IsEnum(AccountType)
  readonly accountType: AccountType;

  @ApiProperty({
    type: [AddressDto],
    required: false,
    description: 'List of user addresses',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  readonly addresses: AddressDto[];

  @ApiProperty({
    example: 'b7e2990e-1234-5678-9101-abcdefabcdef',
    required: false,
    description: 'User ID (UUID)',
  })
  user_id?: string;

  @ApiProperty({
    example: 'refresh_token_value',
    required: false,
    description: 'Refresh token',
  })
  refresh_token?: string;
}

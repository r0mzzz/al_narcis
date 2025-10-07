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

export class AddressDto {
  @IsString()
  address: string;

  @IsBoolean()
  isFavorite: boolean;
}

export class CreateUserDto {
  constructor() {
    this.user_id = randomUUID();
  }

  @IsNotEmpty()
  @IsString()
  readonly first_name: string;

  @IsNotEmpty()
  @IsString()
  readonly last_name: string;

  @IsNotEmpty()
  @IsEmail()
  readonly email: string;

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

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+994\d{9}$/, {
    message: 'Mobil nömrə +994XXXXXXXXX formatında olmalıdır',
  })
  readonly mobile: string;

  @IsOptional()
  @IsString()
  readonly referralCode?: string;

  @IsNotEmpty()
  @IsEnum(AccountType)
  readonly accountType: AccountType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  readonly addresses: AddressDto[];

  user_id?: string;
  refresh_token?: string;
}

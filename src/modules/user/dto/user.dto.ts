import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AppError } from '../../../common/errors';
import { randomUUID } from 'crypto';

export enum AccountType {
  BUSINESS = 'BUSINESS',
  BUYER = 'BUYER',
}

export class CreateUserDto {
  constructor() {
    this.user_id = randomUUID();
    if (this.referralCode === undefined) {
      this.referralCode = null;
    }
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
      message: AppError.PASSWORD_PATTERN_MATCH,
    },
  )
  password: string;

  @IsNotEmpty()
  @IsString()
  readonly mobile: string;

  @IsNotEmpty()
  @IsEnum(AccountType)
  readonly accountType: AccountType;

  @IsString()
  @IsOptional()
  readonly referralCode?: string | null;

  user_id?: string;
  refresh_token?: string;
}

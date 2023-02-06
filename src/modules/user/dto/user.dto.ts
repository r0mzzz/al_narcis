import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import * as uuid from 'uuid';
import { AppError } from '../../../common/errors';

export class CreateUserDto {
  constructor() {
    this.user_id = uuid.v4();
  }

  @IsNotEmpty()
  @IsString()
  readonly first_name?;

  @IsNotEmpty()
  @IsString()
  readonly last_name?;

  @IsNotEmpty()
  @IsEmail()
  readonly email?;

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
  password?;

  @IsNotEmpty()
  username?;

  user_id?;

  refresh_token?;
}

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import * as uuid from 'uuid';

export class CreateUserDto {
  constructor() {
    this.user_id = uuid.v4();
  }

  @IsNotEmpty()
  @IsString()
  readonly first_name;

  @IsNotEmpty()
  @IsString()
  readonly last_name;

  @IsNotEmpty()
  @IsEmail()
  readonly email;

  @IsNotEmpty()
  @IsString()
  password;

  @IsNotEmpty()
  username;

  user_id;

  refreshToken;
}

import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsNotEmpty()
  @IsString()
  readonly email;

  @IsNotEmpty()
  @IsString()
  password;

  access_token: string;
  refresh_token: string;
}

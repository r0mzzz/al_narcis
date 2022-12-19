import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  readonly first_name;

  @IsNotEmpty()
  @IsString()
  readonly last_name;

  @IsNotEmpty()
  @IsString()
  readonly username;

  @IsNotEmpty()
  @IsEmail()
  readonly email;

  @IsNotEmpty()
  @IsString()
  password;
}

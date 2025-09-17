import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(5)
  readonly otp: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  readonly newPassword: string;
}


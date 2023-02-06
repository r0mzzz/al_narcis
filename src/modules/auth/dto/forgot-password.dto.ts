import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsString()
  readonly password;

  @IsNotEmpty()
  @IsString()
  readonly newPassword;
}

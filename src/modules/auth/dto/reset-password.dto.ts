import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email',
    format: 'email',
  })
  @IsNotEmpty()
  @IsString()
  readonly email: string;

  @ApiProperty({
    example: '12345',
    description: 'OTP code (5 digits)',
    minLength: 5,
    maxLength: 5,
    pattern: '^[0-9]{5}$',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(5)
  readonly otp: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description:
      'New password (at least 6 characters, must include letters and numbers)',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  readonly newPassword: string;
}

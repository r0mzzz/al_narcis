import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  @IsNotEmpty()
  @IsString()
  readonly email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    example: 'access_token_value',
    required: false,
    description: 'Access token',
  })
  access_token?: string;

  @ApiProperty({
    example: 'refresh_token_value',
    required: false,
    description: 'Refresh token',
  })
  refresh_token?: string;
}

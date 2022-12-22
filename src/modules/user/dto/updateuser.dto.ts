import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  readonly first_name?;

  @IsOptional()
  @IsString()
  readonly last_name?;

  @IsOptional()
  @IsString()
  username?;

  refresh_token?;
}

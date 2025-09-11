import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AccountType } from './user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  readonly first_name?: string;

  @IsOptional()
  @IsString()
  readonly last_name?: string;

  @IsOptional()
  @IsString()
  readonly mobile?: string;

  @IsOptional()
  @IsEnum(AccountType)
  readonly accountType?: AccountType;

  @IsOptional()
  @IsString()
  readonly referralCode?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;
}

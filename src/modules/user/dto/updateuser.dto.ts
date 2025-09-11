import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AccountType } from './user.dto';

export class UpdateUserDto {
  @IsString()
  readonly first_name?: string;

  @IsString()
  readonly last_name?: string;

  @IsString()
  readonly mobile?: string;

  @IsEnum(AccountType)
  readonly accountType?: AccountType;

  @IsOptional()
  @IsString()
  readonly referralCode?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;
}

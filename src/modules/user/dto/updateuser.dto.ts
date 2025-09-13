import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AccountType } from '../../../common/account-type.enum';

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

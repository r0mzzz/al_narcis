import {
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '../../../common/account-type.enum';
import { AddressDto } from './user.dto';

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

  @IsOptional()
  @IsString()
  readonly password?: string;

  @IsOptional()
  @IsString()
  readonly resetOtp?: string;

  @IsOptional()
  readonly resetOtpExpires?: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  readonly addresses?: AddressDto[];
}

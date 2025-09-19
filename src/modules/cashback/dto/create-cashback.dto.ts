import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { CashbackType } from '../schema/cashback.schema';

export class CreateCashbackDto {
  @IsEnum(CashbackType)
  cashbackType: CashbackType;

  @IsMongoId()
  user_id: string;

  @IsNumber()
  cashbackAmount: number;

  @IsNotEmpty()
  date: Date;

  @IsString()
  paymentKey: string;

  @IsMongoId()
  from_user_id: string;
}

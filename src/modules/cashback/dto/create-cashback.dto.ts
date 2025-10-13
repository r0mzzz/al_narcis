import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CashbackType } from '../schema/cashback.schema';

export class CreateCashbackDto extends CreateOrderDto {
  @ApiProperty({ example: 'REFERRAL', description: 'Type of cashback (enum)' })
  @IsEnum(CashbackType)
  cashbackType: CashbackType;

  @ApiProperty({ example: 100, description: 'Amount of cashback' })
  @IsNumber()
  cashbackAmount: number;

  @ApiProperty({
    example: '60d21b4667d0d8992e610c86',
    description: 'Referrer user ID (MongoDB ObjectId)',
  })
  @IsString()
  @IsOptional()
  from_user_id?: string | null;
}

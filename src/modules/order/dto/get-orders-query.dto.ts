import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order-status.enum';

export class GetOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  fromDate?: string; // ISO date string

  @IsOptional()
  @IsString()
  toDate?: string; // ISO date string

  @IsOptional()
  @Type(() => Number)
  @IsNumberString()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumberString()
  limit?: number;
}

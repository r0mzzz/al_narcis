import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../order-status.enum';

export class GetOrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.WAITING, description: 'Order status to filter by' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ example: '38bcc2fb-d6b8-4336-888e-504fd6ac9749', description: 'User ID to filter by' })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ example: '+994559506330', description: 'Phone number to filter by' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '2025-10-01', description: 'Start date for filtering (inclusive)' })
  @IsOptional()
  @IsString()
  fromDate?: string; // ISO date string

  @ApiPropertyOptional({ example: '2025-10-31', description: 'End date for filtering (inclusive)' })
  @IsOptional()
  @IsString()
  toDate?: string; // ISO date string

  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsNumberString()
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumberString()
  limit?: number;
}

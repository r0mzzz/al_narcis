import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../order-status.enum';

export class UpdateOrderDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.WAITING,
    description: 'Order status',
  })
  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;
}

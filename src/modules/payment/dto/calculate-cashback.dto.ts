import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateCashbackDto extends CreateOrderDto {
  @ApiProperty({ example: 100, description: 'Amount to calculate cashback for' })
  amount: number;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85', description: 'User ID (MongoDB ObjectId)' })
  user_id: string;

  @ApiProperty({ example: 'e93585e2-426d-440a-ae54-67bd20d362be', description: 'GoldenPay payment key' })
  paymentKey: string;

  @ApiProperty({ example: '2023-10-10', description: 'Date of the transaction' })
  date: string;
}

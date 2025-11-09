import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DeleteOrderDto {
  @ApiProperty({
    example: '60d21b4667d0d8992e610c86',
    description: 'Order ID (MongoDB ObjectId)',
  })
  @IsString()
  readonly id: string;
}

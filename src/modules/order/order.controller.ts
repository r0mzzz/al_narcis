import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  async addOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.addOrder(createOrderDto);
  }

  @UseGuards(AccessTokenGuard)
  @Put(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.updateOrder(id, updateOrderDto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }
}

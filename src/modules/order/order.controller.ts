import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { ValidationPipe } from '@nestjs/common';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';

@UseGuards(AdminOrUserGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(AdminOrUserGuard)
  @Post()
  async addOrder(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createOrderDto: CreateOrderDto,
  ) {
    return this.orderService.addOrder(createOrderDto);
  }

  @UseGuards(AdminOrUserGuard)
  @Put(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.updateOrder(id, updateOrderDto);
  }

  @UseGuards(AdminOrUserGuard)
  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    return this.orderService.deleteOrder(id);
  }

  @UseGuards(AdminOrUserGuard)
  @Get()
  async getOrders(@Query() query: GetOrdersQueryDto) {
    return this.orderService.getOrders(query);
  }
}

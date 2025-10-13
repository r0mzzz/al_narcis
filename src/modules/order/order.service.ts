import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  async addOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const createdOrder = new this.orderModel(createOrderDto);
    return createdOrder.save();
  }

  async updateOrder(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    // Only update the orderStatus field
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { orderStatus: updateOrderDto.orderStatus },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async deleteOrder(id: string): Promise<{ deleted: boolean }> {
    const result = await this.orderModel.deleteOne({ _id: id });
    return { deleted: result.deletedCount > 0 };
  }
}

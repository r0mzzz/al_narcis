import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Order } from './schema/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  async addOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    // Generate UUID for paymentKey if null or missing
    if (!createOrderDto.paymentKey) {
      createOrderDto.paymentKey = randomUUID();
    }
    console.log(
      '[ORDER] addOrder() called with:',
      JSON.stringify(createOrderDto),
    );
    try {
      const createdOrder = new this.orderModel(createOrderDto);
      const savedOrder = await createdOrder.save();
      console.log('[ORDER] Order saved successfully:', savedOrder._id);
      return savedOrder;
    } catch (error) {
      console.error('[ORDER] Error saving order:', error);
      throw error;
    }
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

  async getOrders(query: GetOrdersQueryDto) {
    const filter: FilterQuery<Order> = {};
    if (query.status) filter.orderStatus = query.status;
    if (query.user_id) filter.user_id = query.user_id;
    if (query.phoneNumber) filter.phoneNumber = query.phoneNumber;
    if (query.fromDate || query.toDate) {
      filter.paymentDate = {};
      if (query.fromDate) filter.paymentDate.$gte = query.fromDate;
      if (query.toDate) filter.paymentDate.$lte = query.toDate;
    }
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ paymentDate: -1 }),
      this.orderModel.countDocuments(filter),
    ]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

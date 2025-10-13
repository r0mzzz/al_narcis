import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderStatus } from '../order-status.enum';
import { GoldenPayPaymentResult } from '../../product/gp/interfaces/goldenpay-payment-result.interface';

@Schema({ timestamps: true })
export class Order extends Document implements GoldenPayPaymentResult {
  @Prop({ required: true, type: Object })
  status: { code: number; message: string };

  @Prop({ required: true })
  paymentKey: string;

  @Prop({ required: true })
  merchantName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  checkCount: number;

  @Prop({ required: true })
  paymentDate: string;

  @Prop({ required: true })
  cardNumber: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  rrn: string;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.WAITING })
  orderStatus: OrderStatus;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        variant: { type: String, required: true },
        count: { type: Number, required: true },
      },
    ],
    required: true,
    default: [],
  })
  products: {
    productId: string;
    variant: string;
    count: number;
  }[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);

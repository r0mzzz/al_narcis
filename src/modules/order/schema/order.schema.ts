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

  @Prop({ required: true })
  deliveryAddress: string;

  @Prop({
    type: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        productDesc: { type: String, required: true },
        productImage: { type: String, required: true },
        productType: { type: String, required: true },
        category: { type: [String], required: true },
        gender: { type: String, required: true },
        brand: { type: String, required: true },
        variants: [
          {
            capacity: { type: Number, required: true },
            price: { type: Number, required: true },
            _id: { type: String, required: true },
            count: { type: Number, required: true },
            unitPrice: { type: Number, required: true },
            lineTotal: { type: Number, required: true },
          },
        ],
      },
    ],
    required: true,
    default: [],
  })
  products: any[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);

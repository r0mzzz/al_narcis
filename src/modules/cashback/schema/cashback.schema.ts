import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderStatus } from '../../order/order-status.enum';

export type CashbackDocument = Cashback & Document;

export enum CashbackType {
  REFERRAL = 'REFERRAL',
  PURCHASE = 'PURCHASE',
  BONUS = 'BONUS',
}

export class ProductOrderDto {
  @Prop()
  productId: string;
  @Prop()
  productName: string;
  @Prop()
  variant: string;
  @Prop()
  count: number;
}

@Schema({ timestamps: true })
export class Cashback {
  @Prop({ required: true, enum: CashbackType })
  cashbackType: CashbackType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  cashbackAmount: number;

  @Prop({ required: true })
  paymentKey: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  from_user_id?: Types.ObjectId | null;

  @Prop({ type: Object })
  status: { code: number; message: string };

  @Prop()
  merchantName: string;

  @Prop()
  amount: number;

  @Prop()
  checkCount: number;

  @Prop({ type: Date, required: true })
  paymentDate: Date;

  @Prop()
  cardNumber: string;

  @Prop()
  language: string;

  @Prop()
  description: string;

  @Prop()
  rrn: string;

  @Prop()
  phoneNumber: string;

  @Prop({ enum: OrderStatus })
  orderStatus: OrderStatus;

  @Prop({ type: [Object] })
  products: ProductOrderDto[];

  @Prop({ required: true })
  deliveryAddress: string;
}

export const CashbackSchema = SchemaFactory.createForClass(Cashback);

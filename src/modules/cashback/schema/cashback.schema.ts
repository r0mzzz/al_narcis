import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CashbackDocument = Cashback & Document;

export enum CashbackType {
  REFERRAL = 'REFERRAL',
  PURCHASE = 'PURCHASE',
  BONUS = 'BONUS',
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

  // Add any other fields you want to persist from CreateOrderDto, with correct types
  @Prop()
  amount: number;

  @Prop()
  paymentDate: string;

  // ...add more fields as needed
}

export const CashbackSchema = SchemaFactory.createForClass(Cashback);

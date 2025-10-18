import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DiscountDocument = Discount & Document;

export enum DiscountType {
  GLOBAL = 'global',
  USER = 'user',
}

@Schema({ timestamps: true, versionKey: false })
export class Discount {
  @Prop({ required: true, enum: DiscountType })
  type: DiscountType;

  @Prop({ required: false })
  user_id?: string;

  @Prop({ required: true })
  discount: number; // percentage 0-100

  @Prop({ required: false, default: 200 })
  minAmount?: number; // minimum cart subtotal required for this discount (AZN)

  @Prop({ default: true })
  active?: boolean;
}

export const DiscountSchema = SchemaFactory.createForClass(Discount);

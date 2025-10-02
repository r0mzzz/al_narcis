import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Gender } from '../../../common/genre.enum';

export type ProductDocument = Product & Document;

@Schema({ versionKey: false })
export class Product {
  @Prop({
    required: true,
    type: [
      {
        capacity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    validate: [(val: any[]) => val.length > 0, 'At least one variant required'],
  })
  variants: { capacity: number; price: number }[];

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productDesc: string;

  @Prop({ required: false })
  productImage?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ required: true })
  productType: string;

  @Prop({ required: true, type: [String] })
  category: string[];

  @Prop({ required: true, enum: Gender })
  gender: Gender;

  @Prop({ type: Types.ObjectId, ref: 'Brand', required: false })
  brand?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  productId: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Gender } from '../../../common/genre.enum';

export type ProductDocument = Product & Document;

@Schema({ versionKey: false })
export class Product {
  @Prop({
    required: true,
    type: [
      {
        _id: false, // Disable automatic _id generation for subdocuments
        capacity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    validate: [(val: any[]) => val.length > 0, 'At least one variant required'],
  })
  variants: { capacity: number; price: number }[];

  @Prop({ required: false })
  quantity?: number;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productDesc: string;

  @Prop({ required: false })
  productImage?: string;

  @Prop({ type: [String], default: [] })
  images?: string[];

  @Prop({ required: false })
  productType?: string;

  @Prop({ required: true, type: [String] })
  category: string[];

  @Prop({ required: true, enum: Gender })
  gender: Gender;

  @Prop({ required: false })
  brand?: string;

  @Prop({ required: true, unique: true })
  productId: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ required: false })
  brand_id?: string;

  @Prop({ type: Number, enum: [0, 1], default: 1 })
  visible: number;

  @Prop({ required: false })
  mainCategory?: string;

  @Prop({ required: false })
  subCategory?: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

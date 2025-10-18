import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class ProductVariant {
  @Prop({ required: true })
  capacity: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: false })
  _id?: string;

  @Prop({ required: false, default: 1 })
  count?: number;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);

@Schema({ _id: false })
export class CartProduct {
  @Prop({ required: true })
  productId: string;

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ required: false })
  productName?: string;
  @Prop({ required: false })
  productDesc?: string;
  @Prop({ required: false })
  productImage?: string;
  @Prop({ required: false })
  productType?: string;
  @Prop({ required: false })
  category?: string[];
  @Prop({ required: false })
  gender?: string;
  @Prop({ required: false })
  brand?: string;
}

export const CartProductSchema = SchemaFactory.createForClass(CartProduct);

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ required: true })
  user_id: string;

  @Prop({ type: [CartProductSchema], default: [] })
  products: CartProduct[];

  @Prop({ required: false })
  discount?: number; // percentage discount (e.g., 20 means 20%)
}

export const CartSchema = SchemaFactory.createForClass(Cart);

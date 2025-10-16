import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CartItemDto } from '../dto/cart-item.dto';

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ required: true })
  user_id: string;

  @Prop({ type: Array, default: [] })
  items: CartItemDto[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);


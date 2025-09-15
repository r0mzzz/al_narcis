import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductTypeDocument = ProductType & Document;

@Schema({ versionKey: false })
export class ProductType {
  @Prop({ required: true, unique: true })
  name: string;
}

export const ProductTypeSchema = SchemaFactory.createForClass(ProductType);

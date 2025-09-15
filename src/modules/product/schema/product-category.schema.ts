import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema({ versionKey: false })
export class ProductCategory {
  @Prop({ required: true, unique: true })
  categoryName: string;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);

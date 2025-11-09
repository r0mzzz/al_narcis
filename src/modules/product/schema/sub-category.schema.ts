import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubCategoryDocument = SubCategory & Document;

@Schema({ versionKey: false })
export class SubCategory {
  @Prop({ required: true })
  subCategoryName: string;

  @Prop({ type: Types.ObjectId, ref: 'MainCategory', required: true })
  mainCategoryId: string;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

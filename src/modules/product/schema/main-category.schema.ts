import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MainCategoryDocument = MainCategory & Document;

@Schema({ versionKey: false })
export class MainCategory {
  @Prop({ required: true, unique: true })
  mainCategoryName: string;

  @Prop({ required: false })
  imagePath?: string;
}

export const MainCategorySchema = SchemaFactory.createForClass(MainCategory);

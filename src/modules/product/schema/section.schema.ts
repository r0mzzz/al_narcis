import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Section extends Document {
  @Prop({ required: true })
  headerTitle: string;

  @Prop({ required: true })
  orientation: string;

  @Prop({ required: true })
  limit: number;

  @Prop({ required: true })
  categoryName: string;

  @Prop({ required: true })
  productType: string;

  @Prop({ required: true })
  maxRows: number;
}

export const SectionSchema = SchemaFactory.createForClass(Section);


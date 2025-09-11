import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CapacityDocument = Capacity & Document;

@Schema({ versionKey: false })
export class Capacity {
  @Prop({ required: true, unique: true })
  value: number;
}

export const CapacitySchema = SchemaFactory.createForClass(Capacity);


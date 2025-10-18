import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GradationDocument = Gradation & Document;

@Schema({ timestamps: true, versionKey: false })
export class Gradation {
  @Prop({ required: true, unique: true })
  name: string; // bronze, silver, gold, brilliant, platinum

  @Prop({ required: true })
  minReferrals: number; // minimum referral count to reach this gradation

  @Prop({ required: true })
  discountPercent: number; // percentage discount for this gradation

  @Prop({ required: false })
  durationDays?: number | null; // number of days discount is valid after reaching gradation; null or 0 for permanent

  @Prop({ default: true })
  active?: boolean;
}

export const GradationSchema = SchemaFactory.createForClass(Gradation);

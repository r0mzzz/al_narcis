import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CashbackConfigDocument = CashbackConfig & Document;

@Schema({ versionKey: false })
export class CashbackConfig {
  @Prop({ required: true, default: 5 })
  lvl1Percent: number; // 5% for direct referral

  @Prop({ required: true, default: 3 })
  lvl2Percent: number; // 3% for second level

  @Prop({ required: true, default: 1 })
  lvl3Percent: number; // 1% for third level
}

export const CashbackConfigSchema =
  SchemaFactory.createForClass(CashbackConfig);

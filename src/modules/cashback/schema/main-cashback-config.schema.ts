import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MainCashbackConfigDocument = MainCashbackConfig & Document;

@Schema({ versionKey: false })
export class MainCashbackConfig {
  @Prop({ required: true, default: 20 })
  defaultPercent: number; // e.g., 20% for pre-milestone cashback

  @Prop({ required: true, default: 10 })
  milestonePercent: number; // e.g., 10% for post-milestone cashback

  @Prop({ required: true, default: 20000 })
  defaultThreshold: number; // e.g., 20000 coins (200 AZN)

  @Prop({ required: true, default: 10000 })
  milestoneThreshold: number; // e.g., 10000 coins (100 AZN)
}

export const MainCashbackConfigSchema =
  SchemaFactory.createForClass(MainCashbackConfig);

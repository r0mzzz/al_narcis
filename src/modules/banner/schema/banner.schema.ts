import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ versionKey: false })
export class Banner {
  @Prop()
  imagePath?: string; // object path inside the bucket

  @Prop()
  folder?: string; // folder inside the bucket where images are stored

  @Prop()
  link?: string; // optional link URL for the banner

  @Prop({ default: Date.now })
  createdAt?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

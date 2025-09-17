import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AccountType } from '../../../common/account-type.enum';

export type UserDocument = User & Document;

@Schema({ versionKey: false })
export class User {
  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  refresh_token: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  user_id: string;

  @Prop({ required: true })
  mobile: string;

  @Prop({ required: true, enum: Object.values(AccountType) })
  accountType: AccountType;

  @Prop()
  referralCode?: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 0 })
  balanceFromReferrals: number;

  @Prop({ default: 0 })
  referralCount: number;

  @Prop({
    type: String,
    enum: ['bronze', 'silver', 'gold', 'brilliant', 'platinum'],
    default: 'bronze',
  })
  gradation: string;

  @Prop()
  inviteLink?: string;

  @Prop()
  invitedBy?: string;

  @Prop({ type: [Object], default: [] })
  invites?: any[];
}

export const UserSchema = SchemaFactory.createForClass(User);

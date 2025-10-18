import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AccountType } from '../../../common/account-type.enum';
import { v4 as uuidv4 } from 'uuid';

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
    enum: ['bronze', 'silver', 'gold', 'brilliant', 'platinum', null],
    default: null,
  })
  gradation: string | null;

  @Prop()
  gradationReachedAt?: Date;

  @Prop()
  inviteLink?: string;

  @Prop()
  invitedBy?: string;

  @Prop({ type: [Object], default: [] })
  invites?: any[];

  @Prop({ default: false })
  cashbackMilestoneReached: boolean;

  @Prop({ required: true, unique: true, default: uuidv4 })
  user_id: string;

  @Prop()
  imagePath?: string;

  @Prop({
    type: [
      {
        address: { type: String, required: true },
        isFavorite: { type: Boolean, required: true, default: false },
      },
    ],
    default: [],
  })
  addresses: { address: string; isFavorite: boolean }[];
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { CASHBACK_PERCENT_ARRAY } from './cashback.enum';

@Injectable()
export class PaymentService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Calculates and distributes cashback up to 3 levels of referral chain.
   * @param amount The purchase amount in coins (e.g., 100 coins = 1 unit)
   * @param buyerUserId The user_id of the buyer
   */
  async calculateCashback(amount: number, buyerUserId: string): Promise<void> {
    // Find the buyer by user_id
    const buyer = await this.userModel.findOne({ user_id: buyerUserId });
    if (!buyer) throw new NotFoundException('Buyer not found');

    // Convert coins to units for percentage calculation
    const amountInUnits = amount / 100;

    // Traverse up to 3 levels of referral chain
    let currentUser = buyer;
    for (let level = 0; level < CASHBACK_PERCENT_ARRAY.length; level++) {
      const inviterId = currentUser.invitedBy;
      if (!inviterId) break;
      const inviter = await this.userModel.findOne({ user_id: inviterId });
      if (!inviter) break;
      // Only apply cashback if BOTH inviter and invited (currentUser) are BUSINESS accounts
      if (
        inviter.accountType === 'BUSINESS' &&
        currentUser.accountType === 'BUSINESS'
      ) {
        // Calculate cashback as percent of units, then convert to coins
        const cashbackPercent = CASHBACK_PERCENT_ARRAY[level];
        const cashbackInUnits = amountInUnits * cashbackPercent;
        const cashbackInCoins = Math.floor(cashbackInUnits * 100);
        if (cashbackInCoins > 0) {
          await this.userModel.updateOne(
            { user_id: inviter.user_id },
            { $inc: { balanceFromReferrals: cashbackInCoins } },
          );
        }
      }
      currentUser = inviter;
    }
  }
}

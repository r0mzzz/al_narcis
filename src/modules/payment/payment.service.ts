import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { CashbackConfigService } from '../cashback/cashback-config.service';
import { MainCashbackConfigService } from '../cashback/main-cashback-config.service';
import { AccountType } from '../../common/account-type.enum';
import { HistoryService } from '../history/history.service';
import { CashbackService } from '../cashback/cashback.service';
import { CashbackType } from '../cashback/schema/cashback.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private cashbackConfigService: CashbackConfigService,
    private mainCashbackConfigService: MainCashbackConfigService,
    @Inject(forwardRef(() => HistoryService))
    private historyService: HistoryService,
    private cashbackService: CashbackService,
  ) {}

  /**
   * Calculates and distributes cashback up to 3 levels of referral chain.
   * @param amount The purchase amount in coins (e.g., 100 coins = 1 unit)
   * @param buyerUserId The user_id of the buyer
   */
  async calculateCashback(
    amount: number,
    buyerUserId: string,
    paymentKey: string,
  ): Promise<void> {
    // Find the buyer by user_id
    const buyer = await this.userModel.findOne({ user_id: buyerUserId });
    if (!buyer) throw new NotFoundException('Buyer not found');

    // Convert coins to units for percentage calculation
    const amountInUnits = amount / 100;

    // Fetch cashback config from DB
    const cashbackConfig = await this.cashbackConfigService.getConfig();
    const cashbackPercents = [
      cashbackConfig.lvl1Percent / 100,
      cashbackConfig.lvl2Percent / 100,
      cashbackConfig.lvl3Percent / 100,
    ];

    // Traverse up to 3 levels of referral chain
    let currentUser = buyer;
    const payerUserId = buyer.user_id;
    for (let level = 0; level < cashbackPercents.length; level++) {
      const inviterId = currentUser.invitedBy;
      if (!inviterId) break;
      const inviter = await this.userModel.findOne({ user_id: inviterId });
      if (!inviter) break;
      if (!inviter.user_id) {
        Logger.error(
          `Inviter found but user_id is missing: ${JSON.stringify(inviter)}`,
          '',
          'PaymentService',
        );
        break;
      }
      if (!currentUser.user_id) {
        Logger.error(
          `Current user found but user_id is missing: ${JSON.stringify(
            currentUser,
          )}`,
          '',
          'PaymentService',
        );
        break;
      }
      if (
        inviter.accountType === AccountType.BUSINESS &&
        currentUser.accountType === AccountType.BUSINESS
      ) {
        const cashbackPercent = cashbackPercents[level];
        const cashbackInUnits = amountInUnits * cashbackPercent;
        const cashbackInCoins = Math.floor(cashbackInUnits * 100);
        if (cashbackInCoins > 0) {
          await this.userModel.updateOne(
            { user_id: inviter.user_id },
            { $inc: { balanceFromReferrals: cashbackInCoins } },
          );
          await this.cashbackService.create({
            cashbackType: CashbackType.REFERRAL,
            user_id: inviter.user_id,
            cashbackAmount: cashbackInCoins,
            date: new Date(),
            paymentKey,
            from_user_id: payerUserId,
          });
        }
      }
      currentUser = inviter;
    }
  }

  /**
   * Checks and sets the cashback milestone for a user (3 months with >= 20,000 coins, total >= 60,000 coins)
   * @returns true if milestone is reached, false otherwise
   */
  async checkAndSetCashbackMilestone(userId: string): Promise<boolean> {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user || user.accountType !== AccountType.BUSINESS) return false;
    if (user.cashbackMilestoneReached) return true;
    const payments = await this.historyService.findByUser(userId);
    if (!payments || payments.length === 0) return false;
    // Group by month (YYYY-MM)
    const paymentsByMonth: Record<string, number> = {};
    payments.forEach((p) => {
      const date = new Date(p.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      paymentsByMonth[monthKey] = (paymentsByMonth[monthKey] || 0) + p.amount;
    });
    // Find months with >= 20,000 coins
    const qualifiedMonths = Object.values(paymentsByMonth).filter(
      (amt) => amt >= 20000,
    );
    const totalQualified = qualifiedMonths.reduce((sum, amt) => sum + amt, 0);
    if (qualifiedMonths.length >= 3 && totalQualified >= 60000) {
      if (!user.cashbackMilestoneReached) {
        await this.userModel.updateOne(
          { user_id: userId },
          { $set: { cashbackMilestoneReached: true } },
        );
      }
      return true;
    }
    return false;
  }

  /**
   * Applies cashback for a single payment based on milestone status.
   *  - 20% for payments >= 20,000 coins if milestone not reached
   *  - 10% for payments >= 10,000 coins if milestone reached
   * @returns cashback in coins
   */
  async applySinglePaymentCashback(
    userId: string,
    amount: number,
    paymentKey: string,
  ): Promise<number> {
    const user = await this.userModel.findOne({ user_id: userId });
    if (!user) {
      Logger.error(
        `User with user_id ${userId} not found in applySinglePaymentCashback`,
        '',
        'PaymentService',
      );
      throw new NotFoundException(
        `User with user_id ${userId} not found in applySinglePaymentCashback`,
      );
    }
    if (!user.user_id) {
      Logger.error(
        `User found but user_id is missing: ${JSON.stringify(user)}`,
        '',
        'PaymentService',
      );
      throw new NotFoundException(
        'User is missing user_id in applySinglePaymentCashback',
      );
    }
    if (user.accountType !== AccountType.BUSINESS) return 0;
    const milestone = await this.checkAndSetCashbackMilestone(userId);
    const config = await this.mainCashbackConfigService.getConfig();
    let cashbackInCoins = 0;
    let cashbackType = CashbackType.PURCHASE;
    if (!milestone && amount >= config.defaultThreshold) {
      cashbackInCoins = Math.floor(amount * (config.defaultPercent / 100));
    } else if (milestone && amount >= config.milestoneThreshold) {
      cashbackInCoins = Math.floor(amount * (config.milestonePercent / 100));
      cashbackType = CashbackType.BONUS;
    }
    if (cashbackInCoins > 0) {
      await this.userModel.updateOne(
        { user_id: userId },
        { $inc: { balance: cashbackInCoins } },
      );
      await this.cashbackService.create({
        cashbackType,
        user_id: user.user_id,
        cashbackAmount: cashbackInCoins,
        date: new Date(),
        paymentKey,
        from_user_id: null, // Not a referral, so set to null
      });
    }
    return cashbackInCoins;
  }
}

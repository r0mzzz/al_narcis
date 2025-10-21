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
import { OrderService } from '../order/order.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';
import { UsersService } from '../user/user.service';
import { Discount, DiscountDocument } from '../cart/schema/discount.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Discount.name) private discountModel: Model<DiscountDocument>,
    private cashbackConfigService: CashbackConfigService,
    private mainCashbackConfigService: MainCashbackConfigService,
    @Inject(forwardRef(() => HistoryService))
    private historyService: HistoryService,
    private cashbackService: CashbackService,
    private usersService: UsersService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}

  // Resolve applicable discount for a given user_id. Mirrors CartService.getApplicableDiscount
  private async getApplicableDiscount(
    user_id: string,
    subtotal = 0,
    accountType?: AccountType | null,
  ): Promise<{ source: string; discount: number } | null> {
    const DEFAULT_MIN = 200; // AZN
    if (subtotal < DEFAULT_MIN) return null;
    // Cart-level discount not applicable here (no cart-level discount available)
    try {
      // Look for active user-specific discount
      const userDiscount = await this.discountModel
        .findOne({ type: 'user', user_id, active: true })
        .lean()
        .exec();
      if (
        userDiscount &&
        typeof userDiscount.discount === 'number' &&
        (typeof userDiscount.minAmount !== 'number' ||
          subtotal >= userDiscount.minAmount)
      ) {
        return { source: 'user', discount: userDiscount.discount };
      }

      // Global discounts only for BUSINESS users
      if (accountType === AccountType.BUSINESS) {
        const globalDiscounts = await this.discountModel
          .find({ type: 'global', active: true })
          .lean()
          .exec();
        if (Array.isArray(globalDiscounts) && globalDiscounts.length > 0) {
          const eligible = globalDiscounts.filter((d) => {
            return (
              typeof d.discount === 'number' &&
              (typeof d.minAmount !== 'number' || subtotal >= d.minAmount)
            );
          });
          if (eligible.length > 0) {
            const max = eligible.reduce(
              (acc, d) => (d.discount > acc ? d.discount : acc),
              0,
            );
            if (max > 0) return { source: 'global', discount: max };
          }
        }
      }
    } catch (err) {
      // ignore errors and fallback to no discount
    }
    return null;
  }

  /**
   * Calculates and distributes cashback up to 3 levels of referral chain.
   * @param dto The CreateOrderDto containing payment details
   */
  async calculateCashback(dto: CreateOrderDto): Promise<void> {
    // Find the buyer by user_id
    const buyer = await this.userModel.findOne({ user_id: dto.user_id });
    if (!buyer) throw new NotFoundException('Alıcı tapılmadı');

    // Convert coins to units for percentage calculation
    const amountInUnits = dto.amount / 100;

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
        }
        await this.cashbackService.create({
          ...dto,
          cashbackType: CashbackType.REFERRAL,
          user_id: inviter.user_id,
          cashbackAmount: cashbackInCoins,
          from_user_id: payerUserId,
        });
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
    dto: CreateOrderDto,
    cashbackType: CashbackType = CashbackType.PURCHASE,
    from_user_id: string | null = null,
  ): Promise<number> {
    const user = await this.userModel.findOne({ user_id: dto.user_id });
    if (!user || user.accountType !== AccountType.BUSINESS) return 0;

    // Convert coins to units (AZN) to reuse discount logic which expects AZN
    const amountInUnits = dto.amount / 100;

    // Determine discounts similar to CartService
    let gradPercent = 0;
    try {
      if (
        user &&
        user.accountType === AccountType.BUSINESS &&
        amountInUnits >= 200
      ) {
        const grad = await this.usersService.getActiveGradationDiscount(
          user.user_id,
          amountInUnits,
        );
        gradPercent = grad?.discount ?? 0;
      }
    } catch (e) {
      gradPercent = 0;
    }

    let modelPercent;
    try {
      const modelApplicable = await this.getApplicableDiscount(
        user.user_id,
        amountInUnits,
        user.accountType,
      );
      modelPercent = modelApplicable?.discount ?? 0;
    } catch (e) {
      modelPercent = 0;
    }

    let totalDiscountPercent = +(gradPercent + modelPercent);
    if (totalDiscountPercent > 100) totalDiscountPercent = 100;

    // Apply discounts to the payment amount to compute effective amount for cashback
    const discountedAmountCoins = Math.floor(
      dto.amount * (1 - totalDiscountPercent / 100),
    );

    const milestone = await this.checkAndSetCashbackMilestone(dto.user_id);
    const config = await this.mainCashbackConfigService.getConfig();
    let cashbackInCoins = 0;
    if (!milestone && discountedAmountCoins >= config.defaultThreshold) {
      cashbackInCoins = Math.floor(
        discountedAmountCoins * (config.defaultPercent / 100),
      );
    } else if (
      milestone &&
      discountedAmountCoins >= config.milestoneThreshold
    ) {
      cashbackInCoins = Math.floor(
        discountedAmountCoins * (config.milestonePercent / 100),
      );
    }

    await this.userModel.updateOne(
      { user_id: dto.user_id },
      { $inc: { balance: cashbackInCoins } },
    );
    await this.cashbackService.create({
      ...dto,
      cashbackType,
      user_id: user.user_id,
      cashbackAmount: cashbackInCoins,
      paymentKey: dto.paymentKey,
      from_user_id,
      deliveryAddress: dto.deliveryAddress,
    });
    return cashbackInCoins;
  }

  async pay(dto: CreateOrderDto) {
    const [orderResult, cashbackResult, singleCashbackResult] =
      await Promise.allSettled([
        this.orderService.addOrder(dto),
        this.calculateCashback(dto),
        this.applySinglePaymentCashback(dto),
      ]);
    if (orderResult.status === 'rejected') {
      Logger.error(
        `[PAYMENT] addOrder failed: ${orderResult.reason}`,
        '',
        'PaymentService',
      );
    } else {
      Logger.log(
        `[PAYMENT] addOrder result: ${JSON.stringify(orderResult.value)}`,
        'PaymentService',
      );
    }
    if (cashbackResult.status === 'rejected') {
      Logger.error(
        `[PAYMENT] calculateCashback failed: ${cashbackResult.reason}`,
        '',
        'PaymentService',
      );
    }
    if (singleCashbackResult.status === 'rejected') {
      Logger.error(
        `[PAYMENT] applySinglePaymentCashback failed: ${singleCashbackResult.reason}`,
        '',
        'PaymentService',
      );
    }
    return {
      order:
        orderResult.status === 'fulfilled'
          ? orderResult.value
          : { error: orderResult.reason },
      cashback:
        cashbackResult.status === 'fulfilled'
          ? cashbackResult.value
          : { error: cashbackResult.reason },
      singlePaymentCashback:
        singleCashbackResult.status === 'fulfilled'
          ? singleCashbackResult.value
          : { error: singleCashbackResult.reason },
    };
  }
}

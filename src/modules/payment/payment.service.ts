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
  // Milestone logic disabled per request. Preserve implementation here commented out for future reference.
  /*
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
  */

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
    let gradPercent: number;
    let gradObj: any = null;
    try {
      // Always check active gradation discount for the user (UsersService enforces BUSINESS account internally)
      const grad = await this.usersService.getActiveGradationDiscount(
        user.user_id,
      );
      gradPercent = grad?.discount ?? 0;
      gradObj = grad ?? null;
    } catch (e) {
      gradPercent = 0;
    }

    // Only consider active global discounts for payment; ignore per-user discounts in payment flow
    let globalPercent = 0;
    let fetchedGlobalDiscounts: any[] = [];
    try {
      if (user.accountType === AccountType.BUSINESS) {
        const globalDiscounts = await this.discountModel
          .find({ type: 'global', active: true })
          .lean()
          .exec();
        fetchedGlobalDiscounts = globalDiscounts || [];
        if (Array.isArray(globalDiscounts) && globalDiscounts.length > 0) {
          const eligibleGlobals = globalDiscounts.filter((d) => {
            return (
              typeof d.discount === 'number' &&
              (typeof d.minAmount !== 'number' || amountInUnits >= d.minAmount)
            );
          });
          if (eligibleGlobals.length > 0) {
            globalPercent = eligibleGlobals.reduce(
              (acc, d) => (d.discount > acc ? d.discount : acc),
              0,
            );
          }
        }
      }
    } catch (e) {
      globalPercent = 0;
    }

    // Log fetched discount objects to help debug mismatches between cart and payment behavior
    Logger.log(
      `Fetched global discounts: ${JSON.stringify(fetchedGlobalDiscounts)}`,
      'PaymentService',
    );
    Logger.log(
      `Gradation object from usersService.getActiveGradationDiscount: ${JSON.stringify(
        gradObj,
      )}`,
      'PaymentService',
    );

    // modelPercent is only globalPercent for payment (we ignore user-specific discounts here)
    const modelPercent = globalPercent && globalPercent > 0 ? globalPercent : 0;

    // totalDiscountPercent used to compute discounted amount for base cashback should NOT include gradPercent
    let totalDiscountPercent = modelPercent;
    if (totalDiscountPercent > 100) totalDiscountPercent = 100;

    // Apply discounts to the payment amount to compute effective amount for cashback
    const discountedAmountCoins = Math.floor(
      dto.amount * (1 - totalDiscountPercent / 100),
    );

    // Debug log to trace discount resolution
    Logger.log(
      `Cashback calc: user=${user.user_id} amountCoins=${dto.amount} gradPercent=${gradPercent} globalPercent=${globalPercent} modelPercent=${modelPercent} totalDiscountPercent=${totalDiscountPercent} discountedAmountCoins=${discountedAmountCoins}`,
      'PaymentService',
    );

    // Milestone checks removed. Use default cashback threshold/percent only.
    const config = await this.mainCashbackConfigService.getConfig();
    let cashbackInCoins = 0;

    // If there is a model discount (global or user-specific), compute base cashback on discounted amount
    if (modelPercent > 0) {
      if (discountedAmountCoins >= config.defaultThreshold) {
        cashbackInCoins = Math.floor(
          discountedAmountCoins * (config.defaultPercent / 100),
        );
      }
    } else {
      // No model discount: if gradation exists, user expects only gradation cashback (no base cashback)
      if (!gradPercent || gradPercent <= 0) {
        // No discounts at all -> apply base cashback on full amount
        if (dto.amount >= config.defaultThreshold) {
          cashbackInCoins = Math.floor(
            dto.amount * (config.defaultPercent / 100),
          );
        }
      } else {
        // gradPercent > 0 and no model discount -> do not set base cashback (user wants only gradation extra)
        cashbackInCoins = 0;
      }
    }

    // Extra cashback precedence:
    // - if active global exists -> only extraGlobal
    // - else if gradation exists -> only extraGradation
    let extraGlobalCashback = 0;
    let extraGradationCashback = 0;
    if (globalPercent && globalPercent > 0) {
      extraGlobalCashback = Math.floor(dto.amount * (globalPercent / 100));
    } else if (gradPercent && gradPercent > 0) {
      extraGradationCashback = Math.floor(dto.amount * (gradPercent / 100));
    }

    const totalCashbackToGrant =
      (cashbackInCoins || 0) +
      (extraGlobalCashback || 0) +
      (extraGradationCashback || 0);

    Logger.log(
      `Cashback result: base=${cashbackInCoins} extraGlobal=${extraGlobalCashback} extraGradation=${extraGradationCashback} total=${totalCashbackToGrant}`,
      'PaymentService',
    );

    if (totalCashbackToGrant > 0) {
      await this.userModel.updateOne(
        { user_id: dto.user_id },
        { $inc: { balance: totalCashbackToGrant } },
      );

      // Create single cashback record summarizing the granted amount
      await this.cashbackService.create({
        ...dto,
        cashbackType,
        user_id: user.user_id,
        cashbackAmount: totalCashbackToGrant,
        paymentKey: dto.paymentKey,
        from_user_id,
        deliveryAddress: dto.deliveryAddress,
      });
    }

    return totalCashbackToGrant;
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

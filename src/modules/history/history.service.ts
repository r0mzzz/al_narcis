import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentHistory } from './schema/payment-history.schema';
import { CreatePaymentHistoryDto } from './dto/create-payment-history.dto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentService } from '../payment/payment.service';
import { RedisService } from '../../services/redis.service';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel(PaymentHistory.name)
    private paymentHistoryModel: Model<PaymentHistory>,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private redisService: RedisService,
  ) {}

  async create(data: CreatePaymentHistoryDto): Promise<Record<string, any>> {
    const toSave = {
      ...data,
      paymentKey: uuidv4(),
      date: new Date(),
    };
    const created = await this.paymentHistoryModel.create(toSave);
    const obj = created.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...rest } = obj;
    // Always apply cashback using the new logic
    let cashback = 0;
    // if (rest.userId && rest.amount && rest.paymentKey) {
    //   cashback = await this.paymentService.applySinglePaymentCashback(
    //     rest.userId,
    //     rest.amount,
    //     rest.paymentKey,
    //   );
    // }
    // Invalidate caches after new payment
    await this.redisService.del('history:all');
    if (rest.userId) {
      await this.redisService.del(`history:user:${rest.userId}`);
    }
    return { ...rest, cashback };
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const cacheKey = `history:all:page:${page}:limit:${limit}`;
    const cached = await this.redisService.getJson<{
      items: any[];
      total: number;
    }>(cacheKey);
    if (cached) {
      const totalPages = Math.ceil(cached.total / limit);
      return { ...cached, page, limit, totalPages };
    }
    const total = await this.paymentHistoryModel.countDocuments();
    const docs = await this.paymentHistoryModel
      .find()
      .select('-_id -__v')
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const items = docs.map((doc) => doc.toObject());
    await this.redisService.setJson(cacheKey, { items, total }, 3600);
    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages };
  }

  async findByUser(userId: string): Promise<Record<string, any>[]> {
    const cacheKey = `history:user:${userId}`;
    const cached = await this.redisService.getJson<Record<string, any>[]>(
      cacheKey,
    );
    if (cached) return cached;
    const docs = await this.paymentHistoryModel
      .find({ userId })
      .select('-_id -__v')
      .exec();
    const result = docs.map((doc) => doc.toObject());
    await this.redisService.setJson(cacheKey, result, 3600); // cache for 1 hour
    return result;
  }

  async findByPaymentKey(
    paymentKey: string,
  ): Promise<Record<string, any> | null> {
    const doc = await this.paymentHistoryModel
      .findOne({ paymentKey })
      .select('-_id -__v')
      .exec();
    return doc ? doc.toObject() : null;
  }
}

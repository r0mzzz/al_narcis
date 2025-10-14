import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cashback, CashbackDocument } from './schema/cashback.schema';
import { CreateCashbackDto } from './dto/create-cashback.dto';

@Injectable()
export class CashbackService {
  constructor(
    @InjectModel(Cashback.name) private cashbackModel: Model<CashbackDocument>,
  ) {}

  async create(createCashbackDto: CreateCashbackDto): Promise<Cashback | null> {
    if (!createCashbackDto.user_id) {
      Logger.error(
        `Cashback creation failed: user_id is missing. Payload: ${JSON.stringify(
          createCashbackDto,
        )}`,
        '',
        'CashbackService',
      );
      return null;
    }
    // Ensure user_id is a Types.ObjectId
    const cashbackData = {
      ...createCashbackDto,
      user_id: Types.ObjectId.isValid(createCashbackDto.user_id)
        ? new Types.ObjectId(createCashbackDto.user_id)
        : createCashbackDto.user_id,
      paymentDate: new Date(createCashbackDto.paymentDate), // Ensure Date type
    };
    const cashback = new this.cashbackModel(cashbackData);
    return cashback.save();
  }

  async findByUser(
    user_id: string,
    page = 1,
    limit = 10,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    items: Cashback[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: any = { user_id };
    if (fromDate || toDate) {
      filter.paymentDate = {};
      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Set to end of day for inclusivity
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = to;
      }
    }
    const total = await this.cashbackModel.countDocuments(filter);
    const skip = (page - 1) * limit;
    const docs = await this.cashbackModel
      .find(filter)
      .sort({ paymentDate: -1, _id: -1 }) // secondary sort by _id for deterministic order
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(total / limit);
    return { items: docs, total, page, limit, totalPages };
  }

  async findAll(
    page = 1,
    limit = 10,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    items: Cashback[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: any = {};
    if (fromDate || toDate) {
      filter.paymentDate = {};
      if (fromDate) {
        filter.paymentDate.$gte = new Date(fromDate);
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = to;
      }
    }
    const total = await this.cashbackModel.countDocuments(filter);
    const skip = (page - 1) * limit;
    const docs = await this.cashbackModel
      .find(filter)
      .sort({ paymentDate: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(total / limit);
    return { items: docs, total, page, limit, totalPages };
  }
}

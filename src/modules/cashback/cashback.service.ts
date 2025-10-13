import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    const cashback = new this.cashbackModel(createCashbackDto);
    return cashback.save();
  }

  async findByUser(
    user_id: string,
    page = 1,
    limit = 10,
    month?: number,
    year?: number,
  ): Promise<{
    items: Cashback[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Ensure page and limit are always at least 1
    page = Number.isInteger(page) && page > 0 ? page : 1;
    limit = Number.isInteger(limit) && limit > 0 ? limit : 10;
    const filter: any = { user_id };
    if (month && year) {
      // Filter by month and year
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.date = { $gte: start, $lt: end };
    } else if (year) {
      // Filter by year only
      const start = new Date(year, 0, 1);
      const end = new Date(year + 1, 0, 1);
      filter.date = { $gte: start, $lt: end };
    }
    const total = await this.cashbackModel.countDocuments(filter);
    const skip = Math.max((page - 1) * limit, 0);
    const docs = await this.cashbackModel
      .find(filter)
      .sort({ date: -1, _id: -1 }) // secondary sort by _id for deterministic order
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(total / limit);
    return { items: docs, total, page, limit, totalPages };
  }
}

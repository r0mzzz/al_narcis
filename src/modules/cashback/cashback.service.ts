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

  async findByUser(user_id: string) {
    return this.cashbackModel.find({ user_id }).exec();
  }
}

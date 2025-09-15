import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppError } from '../../common/errors';
import { Capacity, CapacityDocument } from './schema/capacity.schema';

@Injectable()
export class CapacityService {
  constructor(
    @InjectModel(Capacity.name)
    private readonly capacityModel: Model<CapacityDocument>,
  ) {}

  async getCapacities(): Promise<number[]> {
    const docs = await this.capacityModel.find().exec();
    return docs.map((doc) => doc.value).sort((a, b) => a - b);
  }

  async addCapacity(capacity: number): Promise<number[]> {
    if (isNaN(capacity)) throw new Error(AppError.CAPACITY_MUST_BE_NUMBER_ONLY);
    const exists = await this.capacityModel.exists({ value: capacity });
    if (!exists) {
      await this.capacityModel.create({ value: capacity });
    }
    return this.getCapacities();
  }

  async updateCapacity(id: string, value: number): Promise<number[]> {
    if (isNaN(value)) throw new Error(AppError.CAPACITY_MUST_BE_NUMBER_ONLY);
    const updated = await this.capacityModel
      .findByIdAndUpdate(id, { value }, { new: true })
      .exec();
    if (!updated) throw new Error(AppError.CAPACITY_NOT_FOUND);
    return this.getCapacities();
  }

  async deleteCapacity(id: string): Promise<number[]> {
    const deleted = await this.capacityModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new Error(AppError.CAPACITY_NOT_FOUND);
    return this.getCapacities();
  }
}

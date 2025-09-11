import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    if (isNaN(capacity)) throw new Error('Capacity must be a number');
    const exists = await this.capacityModel.exists({ value: capacity });
    if (!exists) {
      await this.capacityModel.create({ value: capacity });
    }
    return this.getCapacities();
  }
}

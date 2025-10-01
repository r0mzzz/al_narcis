import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand, BrandDocument } from './schema/brand.schema';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { MinioService } from '../../services/minio.service';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name) private brandModel: Model<BrandDocument>,
    private readonly minioService: MinioService,
  ) {}

  async create(
    createBrandDto: CreateBrandDto,
    image?: Express.Multer.File,
  ): Promise<Brand> {
    let imagePath: string | undefined;
    if (image) {
      imagePath = await this.minioService.upload(image, 'brands');
    }
    const created = new this.brandModel({ ...createBrandDto, imagePath });
    return created.save();
  }

  async findAll(): Promise<Brand[]> {
    return this.brandModel.find().exec();
  }

  async findById(id: string): Promise<Brand> {
    const brand = await this.brandModel.findById(id).exec();
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    image?: Express.Multer.File,
  ): Promise<Brand> {
    const brand = await this.brandModel.findById(id);
    if (!brand) throw new NotFoundException('Brand not found');
    if (image) {
      if (brand.imagePath) await this.minioService.delete(brand.imagePath);
      brand.imagePath = await this.minioService.upload(image, 'brands');
    }
    if (updateBrandDto.name) brand.name = updateBrandDto.name;
    return brand.save();
  }

  async delete(id: string): Promise<void> {
    const brand = await this.brandModel.findById(id);
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.imagePath) await this.minioService.delete(brand.imagePath);
    await this.brandModel.deleteOne({ _id: id });
  }
}

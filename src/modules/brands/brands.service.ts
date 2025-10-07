import { Injectable, NotFoundException } from '@nestjs/common';
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
    // Step 1: Create brand without image to get the ID
    const created = new this.brandModel({ ...createBrandDto });
    const brand = await created.save();
    // Step 2: If image, upload and update imagePath
    if (image) {
      brand.imagePath = await this.minioService.uploadFile(image, 'brands', brand._id.toString());
      await brand.save();
    }
    return brand;
  }

  async findAll(): Promise<Brand[]> {
    return this.brandModel.find().exec();
  }

  async findById(id: string): Promise<Brand> {
    const brand = await this.brandModel.findById(id).exec();
    if (!brand) throw new NotFoundException('Brend tapılmadı');
    return brand;
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    image?: Express.Multer.File,
  ): Promise<Brand> {
    const brand = await this.brandModel.findById(id);
    if (!brand) throw new NotFoundException('Brend tapılmadı');
    if (image) {
      if (brand.imagePath) await this.minioService.delete(brand.imagePath);
      brand.imagePath = await this.minioService.uploadFile(image, 'brands', id);
    }
    if (updateBrandDto.name) brand.name = updateBrandDto.name;
    return brand.save();
  }

  async delete(id: string): Promise<void> {
    const brand = await this.brandModel.findById(id);
    if (!brand) throw new NotFoundException('Brend tapılmadı');
    if (brand.imagePath) await this.minioService.delete(brand.imagePath);
    await this.brandModel.deleteOne({ _id: id });
  }

  async getPresignedImageUrl(imagePath: string): Promise<string> {
    return this.minioService.getPresignedUrl(imagePath);
  }
}

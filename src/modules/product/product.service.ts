import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MinioService } from '../../services/minio.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly minioService: MinioService,
  ) {}

  async findAll(
    productType?: string,
    search?: string,
    limit = 10,
    page = 1,
  ): Promise<{
    data: Record<string, any>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = {};
    if (productType) filter.productType = productType;
    if (search) filter.productName = { $regex: search, $options: 'i' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .select('-__v')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter),
    ]);
    return {
      data: data.map((doc) => doc.toObject()),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Record<string, any>> {
    const product = await this.productModel
      .findById(id)
      .select('-_id -__v')
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product.toObject();
  }

  async create(
    createProductDto: CreateProductDto,
    image?: Express.Multer.File,
  ): Promise<Record<string, any>> {
    // First create the product without image so we can get its _id
    const createdProduct = new this.productModel({
      ...createProductDto,
    });
    await createdProduct.save();

    if (image) {
      // Use the product's Mongo _id as unique identifier for MinIO
      createdProduct.productImage = await this.minioService.upload(
        image,
        createdProduct._id.toString(),
      );
      await createdProduct.save(); // update with image URL
    }
    const obj = createdProduct.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, ...rest } = obj;
    return rest;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    image?: Express.Multer.File,
  ): Promise<Record<string, any>> {
    this.logger.log(
      `updateProductDto received: ${JSON.stringify(updateProductDto)}`,
    );

    const updateData: any = { ...updateProductDto };

    if (image) {
      this.logger.log(`Uploading new product image for product ${id}`);
      updateData.productImage = await this.minioService.upload(image, id);
    }

    this.logger.log(`Mongo updateData: ${JSON.stringify(updateData)}`);
    const product = await this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-_id -__v')
      .exec();

    if (!product) throw new NotFoundException('Product not found');
    this.logger.log(`Updated product: ${JSON.stringify(product)}`);
    return product.toObject();
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }
}

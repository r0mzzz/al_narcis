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

  async create(
    createProductDto: CreateProductDto,
    image?: Express.Multer.File,
  ): Promise<Product> {
    let productImage: string | undefined = undefined;
    if (image) {
      productImage = await this.minioService.upload(image);
    }
    const createdProduct = new this.productModel({
      ...createProductDto,
      productImage,
    });
    return createdProduct.save();
  }

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    image?: Express.Multer.File,
  ): Promise<Product> {
    this.logger.log(
      `updateProductDto received: ${JSON.stringify(updateProductDto)}`,
    );
    const updateData: any = { ...updateProductDto };
    if (image) {
      this.logger.log(`Uploading new product image for product ${id}`);
      updateData.productImage = await this.minioService.upload(image);
    }
    this.logger.log(`Mongo updateData: ${JSON.stringify(updateData)}`);
    const product = await this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    this.logger.log(`Updated product: ${JSON.stringify(product)}`);
    return product;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }
}

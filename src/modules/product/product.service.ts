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

  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(
    createProductDto: CreateProductDto,
    image?: Express.Multer.File,
  ): Promise<Product> {
    // First create the product without image so we can get its _id
    const createdProduct = new this.productModel({
      ...createProductDto,
    });
    await createdProduct.save();

    if (image) {
      // Use the product's Mongo _id as unique identifier for MinIO
      const productImage = await this.minioService.upload(
        image,
        createdProduct._id.toString(),
      );
      createdProduct.productImage = productImage;
      await createdProduct.save(); // update with image URL
    }

    return createdProduct;
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
      updateData.productImage = await this.minioService.upload(image, id);
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

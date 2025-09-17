import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schema/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { MinioService } from '../../services/minio.service';
import {
  ProductCategory,
  ProductCategoryDocument,
} from './schema/product-category.schema';
import { ProductType, ProductTypeDocument } from './schema/product-type.schema';
import { AppError } from '../../common/errors';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly minioService: MinioService,
    @InjectModel(ProductCategory.name)
    private categoryModel: Model<ProductCategoryDocument>,
    @InjectModel(ProductType.name)
    private productTypeModel: Model<ProductTypeDocument>,
  ) {}

  async findAll(
    productType?: string,
    search?: string,
    limit = 10,
    page = 1,
    categories?: string[],
  ): Promise<{
    data: Record<string, any>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = {};
    if (productType) filter.productType = productType;
    if (search) filter.productName = { $regex: search, $options: 'i' };
    if (categories && categories.length > 0) {
      filter.category = { $in: categories };
    }
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
    // Attach images array to each product
    const dataWithImages = await Promise.all(
      data.map(async (doc) => {
        const obj = doc.toObject();
        const images = await this.minioService.getProductImages(
          obj.productName,
          obj._id.toString(),
        );
        // Remove old productImage field if present
        delete obj.productImage;
        return { ...obj, images };
      }),
    );
    return {
      data: dataWithImages,
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
    if (!product) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND);
    return product.toObject();
  }

  async addCategory(categoryName: string): Promise<{ categoryName: string }> {
    if (!categoryName || typeof categoryName !== 'string')
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED);
    categoryName = categoryName.trim();
    if (!categoryName)
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED);
    const exists = await this.categoryModel.findOne({ categoryName }).exec();
    if (exists) throw new BadRequestException(AppError.CATEGORY_ALREADY_EXISTS);
    const created = new this.categoryModel({ categoryName });
    await created.save();
    return { categoryName: created.categoryName };
  }

  async listCategories(): Promise<{ categoryName: string }[]> {
    return (
      await this.categoryModel.find().select('categoryName -_id').exec()
    ).map((c) => ({ categoryName: c.categoryName }));
  }

  async categoryExists(categoryNames: string[]): Promise<boolean> {
    if (!Array.isArray(categoryNames) || categoryNames.length === 0)
      return false;
    const count = await this.categoryModel.countDocuments({
      categoryName: { $in: categoryNames },
    });
    return count === categoryNames.length;
  }

  async updateCategory(
    id: string,
    categoryName: string,
  ): Promise<{ _id: string; categoryName: string }> {
    if (!categoryName || typeof categoryName !== 'string')
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED);
    categoryName = categoryName.trim();
    if (!categoryName)
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED);
    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { categoryName }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(AppError.CATEGORY_NOT_EXISTS);
    return { _id: updated._id.toString(), categoryName: updated.categoryName };
  }

  async deleteCategory(id: string): Promise<void> {
    const deleted = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(AppError.CATEGORY_NOT_EXISTS);
  }

  async create(
    createProductDto: CreateProductDto,
    image?: Express.Multer.File,
  ): Promise<Record<string, any>> {
    if (
      !Array.isArray(createProductDto.category) ||
      createProductDto.category.length === 0
    ) {
      throw new BadRequestException(AppError.CATEGORY_NOT_EXISTS);
    }
    if (!(await this.categoryExists(createProductDto.category))) {
      throw new BadRequestException(AppError.CATEGORY_NOT_EXISTS);
    }
    if (!createProductDto.productType || !(await this.typeExists(createProductDto.productType))) {
      throw new BadRequestException(AppError.PRODUCT_TYPE_NOT_FOUND);
    }
    // First create the product without image so we can get its _id
    const createdProduct = new this.productModel({
      ...createProductDto,
    });
    await createdProduct.save();

    if (image) {
      // Use the product's name and _id as unique identifier for MinIO
      createdProduct.productImage = await this.minioService.upload(
        image,
        createProductDto.productName,
        createdProduct._id.toString(),
      );
      await createdProduct.save(); // update with image URL
    }
    const obj = createdProduct.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __v, ...rest } = obj;
    // Return productId as _id
    return { ...rest, productId: obj._id };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    image?: Express.Multer.File,
  ): Promise<Record<string, any>> {
    if (
      updateProductDto.category &&
      (!Array.isArray(updateProductDto.category) ||
        !(await this.categoryExists(updateProductDto.category)))
    ) {
      throw new BadRequestException(AppError.CATEGORY_NOT_EXISTS);
    }
    if (
      updateProductDto.productType &&
      !(await this.typeExists(updateProductDto.productType))
    ) {
      throw new BadRequestException(AppError.PRODUCT_TYPE_NOT_FOUND);
    }
    const updateData: any = { ...updateProductDto };
    if (image) {
      updateData.productImage = await this.minioService.upload(
        image,
        updateProductDto.productName,
        id,
      );
    }
    const product = await this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-_id -__v')
      .exec();
    if (!product) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND);
    const obj = product.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { __v, ...rest } = obj;
    // Return productId as id
    return { ...rest, productId: product._id };
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND);
  }

  // ProductType CRUD
  async createProductType(name: string): Promise<{ name: string }> {
    if (!name || typeof name !== 'string')
      throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    name = name.trim();
    if (!name) throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    const exists = await this.productTypeModel.findOne({ name }).exec();
    if (exists)
      throw new BadRequestException(AppError.PRODUCT_TYPE_ALREADY_EXISTS);
    const created = new this.productTypeModel({ name });
    await created.save();
    return { name: created.name };
  }

  async getProductTypes(): Promise<{ _id: string; name: string }[]> {
    return (await this.productTypeModel.find().select('name').exec()).map(
      (t) => ({ _id: t._id.toString(), name: t.name }),
    );
  }

  async updateProductType(
    id: string,
    name: string,
  ): Promise<{ _id: string; name: string }> {
    if (!name || typeof name !== 'string')
      throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    name = name.trim();
    if (!name) throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    const updated = await this.productTypeModel
      .findByIdAndUpdate(id, { name }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(AppError.PRODUCT_TYPE_NOT_FOUND);
    return { _id: updated._id.toString(), name: updated.name };
  }

  async deleteProductType(id: string): Promise<void> {
    const deleted = await this.productTypeModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(AppError.PRODUCT_TYPE_NOT_FOUND);
  }

  async addType(name: string): Promise<{ name: string }> {
    if (!name || typeof name !== 'string')
      throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    name = name.trim();
    if (!name) throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    const exists = await this.productTypeModel.findOne({ name }).exec();
    if (exists)
      throw new BadRequestException(AppError.PRODUCT_TYPE_ALREADY_EXISTS);
    const created = new this.productTypeModel({ name });
    await created.save();
    return { name: created.name };
  }

  async updateType(
    id: string,
    name: string,
  ): Promise<{ _id: string; name: string }> {
    if (!name || typeof name !== 'string')
      throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    name = name.trim();
    if (!name) throw new BadRequestException(AppError.TYPE_NAME_REQUIRED);
    const updated = await this.productTypeModel
      .findByIdAndUpdate(id, { name }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(AppError.PRODUCT_TYPE_NOT_FOUND);
    return { _id: updated._id.toString(), name: updated.name };
  }

  async deleteType(id: string): Promise<void> {
    const deleted = await this.productTypeModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(AppError.PRODUCT_TYPE_NOT_FOUND);
  }

  async typeExists(typeName: string): Promise<boolean> {
    if (!typeName) return false;
    const type = await this.productTypeModel.findOne({ name: typeName }).exec();
    return !!type;
  }
}

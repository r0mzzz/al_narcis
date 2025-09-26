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
import { RedisService } from '../../services/redis.service';

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
    private readonly redisService: RedisService,
  ) {}

  private async getProductsCacheVersion(): Promise<string> {
    // Default to '1' if not set
    let v = await this.redisService.get('products:list:version');
    if (!v) {
      await this.redisService.set('products:list:version', '1');
      v = '1';
    }
    return v;
  }

  async findAll(
    productType?: string,
    search?: string,
    limit = 10,
    page = 1,
    categories?: string[],
  ): Promise<unknown> {
    const filter: any = {};
    if (productType) filter.productType = productType;
    if (search) filter.productName = { $regex: search, $options: 'i' };
    if (categories && categories.length > 0) {
      filter.category = { $in: categories };
    }

    // Only cache unfiltered, unpaginated queries
    const isCacheable =
      !productType && !search && (!categories || categories.length === 0);
    const version = await this.getProductsCacheVersion();
    const cacheKey = `products:list:v${version}`;

    let allProducts: any[];
    let total: number;

    if (isCacheable) {
      const cached = await this.redisService.getJson<{
        data: any[];
        total: number;
      }>(cacheKey);
      if (cached) {
        this.logger.debug(`Returning products from cache key=${cacheKey}`);
        allProducts = cached.data;
        total = cached.total;
      } else {
        const products = await this.productModel
          .find({})
          .select('-__v')
          .sort({ _id: -1 })
          .exec();
        allProducts = await Promise.all(
          products.map(async (doc) => {
            const obj = doc.toObject();
            let images: string[] = [];
            if (Array.isArray(obj.images) && obj.images.length > 0) {
              images = obj.images;
            } else {
              try {
                images = await this.minioService.getProductImages(
                  obj.productName,
                  obj._id.toString(),
                );
              } catch (e) {
                this.logger.debug(
                  `Failed to fetch images for product ${obj._id}: ${e?.message}`,
                );
                images = [];
              }
            }
            delete obj.productImage;
            return { ...obj, images };
          }),
        );
        total = allProducts.length;
        await this.redisService.setJson(
          cacheKey,
          { data: allProducts, total },
          300,
        );
        this.logger.log(`Rebuilt products cache key=${cacheKey}`);
      }
    } else {
      // For filtered queries, always hit DB
      const products = await this.productModel
        .find(filter)
        .select('-__v')
        .sort({ _id: -1 })
        .exec();
      allProducts = await Promise.all(
        products.map(async (doc) => {
          const obj = doc.toObject();
          let images: string[] = [];
          if (Array.isArray(obj.images) && obj.images.length > 0) {
            images = obj.images;
          } else {
            try {
              images = await this.minioService.getProductImages(
                obj.productName,
                obj._id.toString(),
              );
            } catch (e) {
              this.logger.debug(
                `Failed to fetch images for product ${obj._id}: ${e?.message}`,
              );
              images = [];
            }
          }
          delete obj.productImage;
          return { ...obj, images };
        }),
      );
      total = allProducts.length;
    }

    // Apply limit/page in memory
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;
    const pagedData = allProducts.slice(skip, skip + parsedLimit);

    return {
      data: pagedData,
      total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  async findOne(id: string): Promise<Record<string, any>> {
    const product = await this.productModel
      .findById(id)
      .select('-_id -__v')
      .exec();
    if (!product) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND);
    const obj = product.toObject();
    const images = await this.minioService.getProductImages(
      obj.productName,
      id,
    );
    return { ...obj, images };
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
    if (
      !createProductDto.productType ||
      !(await this.typeExists(createProductDto.productType))
    ) {
      throw new BadRequestException(AppError.PRODUCT_TYPE_NOT_FOUND);
    }

    const createdProduct = new this.productModel({
      ...createProductDto,
    });
    await createdProduct.save();

    if (image) {
      // Use the product's name and _id as unique identifier for MinIO
      const url = await this.minioService.upload(
        image,
        createProductDto.productName,
        createdProduct._id.toString(),
      );
      createdProduct.images = [url];
      await createdProduct.save();
    }

    try {
      // Bump cache version and remove old caches (including legacy keys)
      const newVersion = await this.redisService.incr('products:list:version');
      await this.redisService.delByPattern('products:list*');
      await this.redisService.set('products:list:version', String(newVersion));
      this.logger.log('Invalidated products:list cache after create');
    } catch (e) {
      this.logger.debug(
        `Failed to invalidate products cache after create: ${e?.message || e}`,
      );
    }

    await this.refreshProductsCache();

    const obj = createdProduct.toObject();
    delete (obj as any).__v;
    return { ...obj, productId: obj._id };
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    images?: Express.Multer.File[],
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

    if (images && images.length > 0) {
      const uploadedUrls: string[] = [];
      for (const image of images) {
        const url = await this.minioService.upload(
          image,
          updateProductDto.productName,
          id,
        );
        uploadedUrls.push(url);
      }

      const existing = await this.productModel
        .findById(id)
        .select('images')
        .exec();
      const merged = (existing?.images || []).concat(uploadedUrls);
      updateData.images = merged;
    }

    const product = await this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-_id -__v')
      .exec();

    if (!product) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND);

    try {
      // Bump cache version and remove old caches (including legacy keys)
      const newVersion = await this.redisService.incr('products:list:version');
      await this.redisService.delByPattern('products:list*');
      await this.redisService.set('products:list:version', String(newVersion));
      this.logger.log('Invalidated products:list cache after update');
    } catch (e) {
      this.logger.debug(
        `Failed to invalidate products cache after update: ${e?.message || e}`,
      );
    }

    await this.refreshProductsCache();

    const obj = product.toObject();
    return { ...obj, productId: product._id, images: obj.images || [] };
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND);

    try {
      // Bump cache version and remove old caches (including legacy keys)
      const newVersion = await this.redisService.incr('products:list:version');
      await this.redisService.delByPattern('products:list*');
      await this.redisService.set('products:list:version', String(newVersion));
      this.logger.log('Invalidated products:list cache after delete');
    } catch (e) {
      this.logger.debug(
        `Failed to invalidate products cache after delete: ${e?.message || e}`,
      );
    }

    await this.refreshProductsCache();
  }

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

  async typeExists(typeName: string): Promise<boolean> {
    if (!typeName) return false;
    const type = await this.productTypeModel.findOne({ name: typeName }).exec();
    return !!type;
  }

  // Helper to rebuild products list cache for given limit/page (defaults to 10/1)
  private async refreshProductsCache() {
    try {
      const products = await this.productModel
        .find({})
        .select('-__v')
        .sort({ _id: -1 })
        .exec();
      const allProducts = await Promise.all(
        products.map(async (doc) => {
          const obj = doc.toObject();
          const images =
            Array.isArray(obj.images) && obj.images.length > 0
              ? obj.images
              : await this.minioService
                  .getProductImages(obj.productName, obj._id.toString())
                  .catch(() => []);
          delete (obj as any).productImage;
          return { ...obj, images };
        }),
      );
      const total = allProducts.length;
      const version = await this.getProductsCacheVersion();
      const cacheKey = `products:list:v${version}`;
      await this.redisService.setJson(
        cacheKey,
        { data: allProducts, total },
        300,
      );
      this.logger.log(`Rebuilt products cache key=${cacheKey}`);
    } catch (e) {
      this.logger.debug(`Failed to refresh products cache: ${e?.message || e}`);
    }
  }
}

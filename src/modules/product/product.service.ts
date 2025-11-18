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
import { v4 as uuidv4 } from 'uuid';
import { Tag, TagDocument } from './schema/tag.schema';
import { GenderService } from './gender.service';
import { Section } from './schema/section.schema';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';
import {
  MainCategory,
  MainCategoryDocument,
} from './schema/main-category.schema';
import { SubCategory, SubCategoryDocument } from './schema/sub-category.schema';

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
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    private readonly genderService: GenderService,
    @InjectModel(Section.name) private sectionModel: Model<Section>,
    @InjectModel(MainCategory.name)
    private mainCategoryModel: Model<MainCategoryDocument>,
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
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
    categories?: string | string[],
    tag?: string,
    gender?: string,
    status?: number, // <-- Accept status param
    visible?: string | number, // optional visible param from query
    mainCategory?: string, // <-- Add mainCategory param
    subCategory?: string, // <-- Add subCategory param
  ): Promise<unknown> {
    // Do not filter by `visible` here so products with visible 0 and 1 are returned.
    // Previously we defaulted to { visible: 1 } which hid invisible products.
    const filter: any = {};
    // Coerce status and visible to numbers if they come as strings
    if (status !== undefined) status = Number(status);
    if (visible !== undefined)
      visible = typeof visible === 'string' ? Number(visible) : visible;

    if (productType) filter.productType = productType;
    if (mainCategory) filter.mainCategory = mainCategory;
    if (subCategory) filter.subCategory = subCategory;
    if (search) filter.productName = { $regex: search, $options: 'i' };
    // Normalize categories to array if caller passed a string
    if (categories) {
      if (typeof categories === 'string') {
        const trimmed = categories.trim();
        if (trimmed.length > 0) {
          // allow comma-separated list as well
          const arr = trimmed.includes(',')
            ? trimmed
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean)
            : [trimmed];
          if (arr.length > 0) filter.category = { $in: arr };
        }
      } else if (Array.isArray(categories) && categories.length > 0) {
        filter.category = { $in: categories };
      }
    }
    if (tag) filter.tags = tag;
    if (gender) filter.gender = gender;
    if (status !== undefined) filter.status = status; // <-- Add status to filter
    // visible handling:
    // - If visible explicitly provided (0 or 1) use it.
    // - Otherwise, if a status filter is provided, default to visible = 1 so callers
    //   who request status=1 don't get invisible (visible=0) products.
    if (visible !== undefined && (visible === 0 || visible === 1)) {
      filter.visible = visible;
    } else if (status !== undefined) {
      // If client requested a status filter and didn't explicitly set visible,
      // default to visible=1 to avoid returning invisible products when asking for active status.
      filter.visible = 1;
    }
    this.logger.debug(
      `Final product filter before DB query: ${JSON.stringify(filter)}`,
    );

    // Caching disabled for findAll — always hit DB to ensure up-to-date results.
    /*
    // Only cache unfiltered, unpaginated queries
    const isCacheable =
      !productType &&
      !search &&
      (!categories || categories.length === 0) &&
      !tag &&
      !gender;
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
          .find({ visible: 1 })
          .select('-__v')
          .sort({ _id: -1 })
          .exec();
        allProducts = await Promise.all(
          products.map(async (doc) => {
            const obj = doc.toObject();
            let presignedImage = '';
            if (obj.productImage) {
              presignedImage = await this.minioService.getPresignedUrl(
                obj.productImage,
              );
            }
            delete obj.images;
            return { ...obj, productImage: presignedImage };
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
          let presignedImage = '';
          if (obj.productImage) {
            presignedImage = await this.minioService.getPresignedUrl(
              obj.productImage,
            );
          }
          delete obj.images;
          return { ...obj, productImage: presignedImage };
        }),
      );
      this.logger.debug(`Products from DB: ${allProducts.length}`);
      this.logger.debug(
        `All gender values from DB: ${JSON.stringify(
          allProducts.map((p: any) => p.gender),
        )}`,
      );
      // Defensive: filter in memory as well
      if (gender) {
        allProducts = allProducts.filter(
          (p) => typeof (p as any).gender === 'string' && (p as any).gender === gender,
        );
        this.logger.debug(
          `Products after in-memory gender filter: ${allProducts.length}`,
        );
        if (allProducts.length > 0) {
          this.logger.debug(
            `Example gender values: ${allProducts
              .slice(0, 5)
              .map((p: any) => p.gender)
              .join(', ')}`,
          );
        }
      }
      total = allProducts.length;
    }
    */

    // Always fetch from DB to include both visible 0 and 1 and avoid stale cache
    // Build a map from gender type -> localized name so products return gender name
    const genders = this.genderService.findAll();
    const genderMap: Record<string, string> = Object.fromEntries(
      genders.map((g) => [g.type, g.name || g.type]),
    );

    const products = await this.productModel
      .find(filter)
      .select('-__v')
      .sort({ _id: -1 })
      .exec();
    let allProducts: any[] = await Promise.all(
      products.map(async (doc) => {
        const obj = doc.toObject();
        // Keep original stored gender type (e.g. 'MAN') in obj.gender
        // and add a new field `genderType` with the localized name (e.g. 'Kişi')
        const _origGender = obj.gender;
        if (_origGender && typeof _origGender === 'string') {
          obj.genderType = genderMap[_origGender] || _origGender;
        } else {
          obj.genderType = _origGender;
        }
        let presignedImage = '';
        if (obj.productImage) {
          presignedImage = await this.minioService.getPresignedUrl(
            obj.productImage,
          );
        }
        delete obj.images;
        return { ...obj, productImage: presignedImage };
      }),
    );
    // Defensive: filter in memory as well
    if (gender) {
      allProducts = allProducts.filter(
        (p) =>
          typeof (p as any).gender === 'string' && (p as any).gender === gender,
      );
      this.logger.debug(
        `Products after in-memory gender filter: ${allProducts.length}`,
      );
      if (allProducts.length > 0) {
        this.logger.debug(
          `Example gender values: ${allProducts
            .slice(0, 5)
            .map((p: any) => p.gender)
            .join(', ')}`,
        );
      }
    }
    const total = allProducts.length;

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
      totalPages: Math.ceil(total / parsedLimit),
    };
  }

  async findOne(id: string): Promise<Record<string, any>> {
    const product = await this.productModel
      .findById(id)
      .select('-_id -__v')
      .exec();
    if (!product) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND.az);
    const obj = product.toObject();

    // Add genderType (localized name) while keeping obj.gender as stored type
    const genders = this.genderService.findAll();
    const genderMap: Record<string, string> = Object.fromEntries(
      genders.map((g) => [g.type, g.name || g.type]),
    );
    const _origGender = obj.gender;
    if (_origGender && typeof _origGender === 'string') {
      obj.genderType = genderMap[_origGender] || _origGender;
    } else {
      obj.genderType = _origGender;
    }

    let presignedImage = '';
    if (obj.productImage) {
      presignedImage = await this.minioService.getPresignedUrl(
        obj.productImage,
      );
    }
    delete obj.images;
    return { ...obj, productImage: presignedImage };
  }

  // Find product by unique productId field (not Mongo _id)
  async findByProductId(
    productId: string,
  ): Promise<Record<string, any> | null> {
    const product = await this.productModel
      .findOne({ productId })
      .select('-_id -__v')
      .exec();
    if (!product) return null;
    const obj = product.toObject();

    // Add genderType (localized name) while keeping obj.gender as stored type
    const genders = this.genderService.findAll();
    const genderMap: Record<string, string> = Object.fromEntries(
      genders.map((g) => [g.type, g.name || g.type]),
    );
    const _origGender = obj.gender;
    if (_origGender && typeof _origGender === 'string') {
      obj.genderType = genderMap[_origGender] || _origGender;
    } else {
      obj.genderType = _origGender;
    }

    let presignedImage = '';
    if (obj.productImage) {
      presignedImage = await this.minioService.getPresignedUrl(
        obj.productImage,
      );
    }
    delete obj.images;
    return { ...obj, productImage: presignedImage };
  }

  async addCategory(categoryName: string): Promise<{ categoryName: string }> {
    if (!categoryName || typeof categoryName !== 'string')
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED.az);
    categoryName = categoryName.trim();
    if (!categoryName)
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED.az);
    const exists = await this.categoryModel.findOne({ categoryName }).exec();
    if (exists)
      throw new BadRequestException(AppError.CATEGORY_ALREADY_EXISTS.az);
    const created = new this.categoryModel({ categoryName });
    await created.save();
    return { categoryName: created.categoryName };
  }

  async listCategories(): Promise<{ _id: string; categoryName: string }[]> {
    return this.categoryModel.find().select('_id categoryName').exec();
  }

  async updateCategory(
    id: string,
    categoryName: string,
  ): Promise<{ _id: string; categoryName: string }> {
    if (!categoryName || typeof categoryName !== 'string')
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED.az);
    categoryName = categoryName.trim();
    if (!categoryName)
      throw new BadRequestException(AppError.CATEGORY_NAME_REQUIRED.az);
    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { categoryName }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(AppError.CATEGORY_NOT_EXISTS.az);
    return { _id: updated._id.toString(), categoryName: updated.categoryName };
  }

  async deleteCategory(id: string): Promise<void> {
    const deleted = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(AppError.CATEGORY_NOT_EXISTS.az);
  }

  async create(
    createProductDto: CreateProductDto,
    image?: Express.Multer.File,
  ): Promise<Record<string, any>> {
    // Validate categories (case-insensitive, trimmed)
    if (
      !Array.isArray(createProductDto.category) ||
      createProductDto.category.length === 0
    ) {
      throw new BadRequestException(AppError.CATEGORY_NOT_EXISTS.az);
    }
    // Reject if any category value looks like an ObjectId (24 hex chars)
    const invalidCategory = createProductDto.category.find(
      (cat) => typeof cat === 'string' && /^[a-f\d]{24}$/i.test(cat.trim()),
    );
    if (invalidCategory) {
      throw new BadRequestException(
        'Kateqoriya adı göndərin, ID yox. (Send category name, not ID)',
      );
    }
    const foundCategories = await this.getCategoriesByNames(
      createProductDto.category,
    );
    if (foundCategories.length !== createProductDto.category.length) {
      const foundNames = foundCategories.map((c) =>
        c.categoryName.toLowerCase(),
      );
      const missing = createProductDto.category.filter(
        (n) => !foundNames.includes(n.trim().toLowerCase()),
      );
      throw new BadRequestException(
        `Aşağıdakı kateqoriyalar mövcud deyil: ${missing.join(', ')}`,
      );
    }

    const brand_id = createProductDto.brand_id || createProductDto.brand;
    let brandStr = undefined;
    if (brand_id) {
      brandStr = String(brand_id);
    }
    const createdProduct = new this.productModel({
      ...createProductDto,
      brand: createProductDto.brand,
      brand_id: brandStr,
      productImage: '',
      productId: uuidv4(),
      // Optionally, store category IDs instead of names:
      // category: foundCategories.map((c) => c._id),
    });
    await createdProduct.save();

    if (image) {
      createdProduct.productImage = await this.minioService.upload(
        image,
        createdProduct._id.toString(),
      );
      await createdProduct.save();
    }
    let presignedImage = '';
    if (createdProduct.productImage) {
      presignedImage = await this.minioService.getPresignedUrl(
        createdProduct.productImage,
      );
    }
    const obj = createdProduct.toObject();
    obj.productImage = presignedImage;
    return obj;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    image?: Express.Multer.File,
  ): Promise<Record<string, any>> {
    if (
      updateProductDto.category &&
      (!Array.isArray(updateProductDto.category) ||
        updateProductDto.category.length === 0)
    ) {
      throw new BadRequestException(AppError.CATEGORY_NOT_EXISTS.az);
    }
    if (updateProductDto.category) {
      // Reject if any category value looks like an ObjectId (24 hex chars)
      const invalidCategory = updateProductDto.category.find(
        (cat) => typeof cat === 'string' && /^[a-f\d]{24}$/i.test(cat.trim()),
      );
      if (invalidCategory) {
        throw new BadRequestException(
          'Kateqoriya adı göndərin, ID yox. (Send category name, not ID)',
        );
      }
      const foundCategories = await this.getCategoriesByNames(
        updateProductDto.category,
      );
      if (foundCategories.length !== updateProductDto.category.length) {
        const foundNames = foundCategories.map((c) =>
          c.categoryName.toLowerCase(),
        );
        const missing = updateProductDto.category.filter(
          (n) => !foundNames.includes(n.trim().toLowerCase()),
        );
        throw new BadRequestException(
          `Aşağıdakı kateqoriyalar mövcud deyil: ${missing.join(', ')}`,
        );
      }
      // Optionally, update to store category IDs:
      // updateProductDto.category = foundCategories.map((c) => c._id);
    }
    if (
      updateProductDto.productType &&
      !(await this.typeExists(updateProductDto.productType))
    ) {
      throw new BadRequestException(AppError.PRODUCT_TYPE_NOT_FOUND.az);
    }
    if (updateProductDto.tags && updateProductDto.tags.length > 0) {
      const count = await this.tagModel.countDocuments({
        name: { $in: updateProductDto.tags },
      });
      if (count !== updateProductDto.tags.length) {
        throw new BadRequestException('Bir və ya bir neçə etiket mövcud deyil');
      }
    }

    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND.az);
    if (image) {
      if (product.productImage) {
        await this.minioService.delete(product.productImage);
      }
      product.productImage = await this.minioService.upload(image, id);
    }
    const brand_id = updateProductDto.brand_id || updateProductDto.brand;
    if (brand_id) {
      product.brand = String(brand_id);
      product.brand_id = String(brand_id);
    }
    Object.assign(product, updateProductDto);
    await product.save();

    // Invalidate cache
    try {
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

    // Return product with presigned URL for image
    let presignedImage = '';
    if (product.productImage) {
      presignedImage = await this.minioService.getPresignedUrl(
        product.productImage,
      );
    }
    const obj = product.toObject();
    obj.productImage = presignedImage;
    return obj;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(AppError.PRODUCT_NOT_FOUND.az);

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

  async findByBrand(
    brandId: string,
    productType?: string,
    search?: string,
    limit = 10,
    page = 1,
    categories?: string[],
    tag?: string,
    gender?: string,
    status?: number,
    visible?: string | number,
    mainCategory?: string,
    subCategory?: string,
  ) {
    // Build filter: always filter by brand_id
    const filter: any = { brand_id: brandId };

    // Add all the same filters as findAll
    if (productType) filter.productType = productType;
    if (mainCategory) filter.mainCategory = mainCategory;
    if (subCategory) filter.subCategory = subCategory;
    if (search && search.trim().length > 0) {
      filter.productName = { $regex: search.trim(), $options: 'i' };
    }
    if (categories && Array.isArray(categories) && categories.length > 0) {
      filter.category = { $in: categories };
    }
    if (tag) filter.tags = tag;
    if (gender) filter.gender = gender;
    if (status !== undefined) filter.status = status;

    // Handle visible parameter
    if (visible !== undefined && visible !== null && visible !== '') {
      const v = typeof visible === 'string' ? Number(visible) : visible;
      if (v === 0 || v === 1) {
        filter.visible = v;
      }
    } else if (status !== undefined) {
      // Default to visible=1 when status filter is provided
      filter.visible = 1;
    } else {
      // Default to visible=1 (only show visible products)
      filter.visible = 1;
    }

    this.logger.debug(`findByBrand filter: ${JSON.stringify(filter)}`);
    const products = await this.productModel
      .find(filter)
      .select('-__v')
      .sort({ _id: -1 })
      .exec();
    const allProducts: any[] = await Promise.all(
      products.map(async (doc) => {
        const obj = doc.toObject();
        let presignedImage = '';
        if (obj.productImage) {
          presignedImage = await this.minioService.getPresignedUrl(
            obj.productImage,
          );
        }
        delete obj.images;
        return { ...obj, productImage: presignedImage };
      }),
    );
    const total = allProducts.length;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;
    const pagedData = allProducts.slice(skip, skip + parsedLimit);
    return { data: pagedData, total, page: parsedPage, limit: parsedLimit };
  }

  async findByTag(tag: string, limit = 10, page = 1) {
    const filter: any = { tags: tag, visible: 1 };
    const products = await this.productModel
      .find(filter)
      .select('-__v')
      .sort({ _id: -1 })
      .exec();
    const allProducts: any[] = await Promise.all(
      products.map(async (doc) => {
        const obj = doc.toObject();
        let presignedImage = '';
        if (obj.productImage) {
          presignedImage = await this.minioService.getPresignedUrl(
            obj.productImage,
          );
        }
        delete obj.images;
        return { ...obj, productImage: presignedImage };
      }),
    );
    const total = allProducts.length;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;
    const pagedData = allProducts.slice(skip, skip + parsedLimit);
    return { data: pagedData, total, page: parsedPage, limit: parsedLimit };
  }

  async searchByProductName(query: string, limit = 10, page = 1) {
    const filter: any = {
      productName: { $regex: query, $options: 'i' },
      visible: 1,
    };
    const products = await this.productModel
      .find(filter)
      .select('-__v')
      .sort({ _id: -1 })
      .exec();
    const allProducts: any[] = await Promise.all(
      products.map(async (doc) => {
        const obj = doc.toObject();
        let presignedImage = '';
        if (obj.productImage) {
          presignedImage = await this.minioService.getPresignedUrl(
            obj.productImage,
          );
        }
        delete obj.images;
        return { ...obj, productImage: presignedImage };
      }),
    );
    const total = allProducts.length;
    const parsedLimit = Number(limit) || 10;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;
    const pagedData = allProducts.slice(skip, skip + parsedLimit);
    return { data: pagedData, total, page: parsedPage, limit: parsedLimit };
  }

  // Helper to rebuild products list cache for given limit/page (defaults to 10/1)
  private async refreshProductsCache() {
    try {
      const products = await this.productModel
        .find({ visible: 1 })
        .select('-__v')
        .sort({ _id: -1 })
        .exec();
      const allProducts: any[] = await Promise.all(
        products.map(async (doc) => {
          const obj = doc.toObject();
          let presignedImage = '';
          if (obj.productImage) {
            presignedImage = await this.minioService.getPresignedUrl(
              obj.productImage,
            );
          }
          delete obj.images;
          return { ...obj, productImage: presignedImage };
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

  async findCategoryIdByName(name: string): Promise<string | null> {
    // Case-insensitive, trimmed match
    const cat = await this.categoryModel
      .findOne({
        categoryName: { $regex: `^${name.trim()}$`, $options: 'i' },
      })
      .select('_id')
      .exec();
    return cat ? cat._id.toString() : null;
  }

  // Helper: Given a list of category names, returns all matching categories (case-insensitive, trimmed)
  private async getCategoriesByNames(
    names: string[],
  ): Promise<{ _id: string; categoryName: string }[]> {
    if (!Array.isArray(names) || names.length === 0) return [];
    const uniqueNames = Array.from(
      new Set(names.map((n) => n.trim()).filter(Boolean)),
    );
    if (uniqueNames.length === 0) return [];
    const regexes = uniqueNames.map((n) => new RegExp(`^${n}$`, 'i'));
    return this.categoryModel
      .find({ categoryName: { $in: regexes } })
      .select('_id categoryName')
      .exec();
  }

  async createSection(dto: CreateSectionDto): Promise<Section> {
    this.logger.log(`Creating section: ${JSON.stringify(dto)}`);
    const section = new this.sectionModel(dto);
    return await section.save();
  }

  async updateSection(id: string, dto: UpdateSectionDto): Promise<Section> {
    this.logger.log(`Updating section ${id}: ${JSON.stringify(dto)}`);
    const updated = await this.sectionModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Section not found');
    return updated;
  }

  async deleteSection(id: string): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting section ${id}`);
    const result = await this.sectionModel.deleteOne({ _id: id });
    return { deleted: result.deletedCount > 0 };
  }

  async getSections(): Promise<Section[]> {
    this.logger.log('Fetching all sections');
    return this.sectionModel.find().lean();
  }

  // Main Category CRUD
  async createMainCategory(dto: { mainCategoryName: string }) {
    if (!dto.mainCategoryName || typeof dto.mainCategoryName !== 'string')
      throw new BadRequestException('Main category name is required');
    const exists = await this.mainCategoryModel.findOne({
      mainCategoryName: dto.mainCategoryName.trim(),
    });
    if (exists) throw new BadRequestException('Main category already exists');
    const created = new this.mainCategoryModel({
      mainCategoryName: dto.mainCategoryName.trim(),
    });
    await created.save();
    return {
      _id: created._id.toString(),
      mainCategoryName: created.mainCategoryName,
    };
  }

  // Helper to convert a full presigned URL to a relative path with query string, always prefixing /product-images/
  private presignedUrlToRelativePath(url: string): string {
    if (!url) return '';
    try {
      const u = new URL(url);
      // Remove any leading /product-images/ from the path, then add exactly one
      const path = u.pathname.replace(/^\/product-images\//, '');
      return '/product-images/' + path + u.search;
    } catch {
      return url; // fallback
    }
  }

  async getMainCategories() {
    const categories = await this.mainCategoryModel.find().exec();
    return Promise.all(
      categories.map(async (cat) => {
        let imageUrl = null;
        if (cat.imagePath) {
          const presigned = await this.minioService.getPresignedUrl(
            cat.imagePath,
          );
          imageUrl = this.presignedUrlToRelativePath(presigned);
        }
        return {
          _id: cat._id.toString(),
          mainCategoryName: cat.mainCategoryName,
          imagePath: imageUrl,
        };
      }),
    );
  }

  async updateMainCategory(
    id: string,
    dto: { mainCategoryName?: string },
    image?: Express.Multer.File,
  ) {
    const update: any = {};
    if (dto.mainCategoryName) {
      update.mainCategoryName = dto.mainCategoryName.trim();
    }
    if (image) {
      const ext = image.originalname.split('.').pop();
      // Only store 'main-category/filename' in DB
      const fileName = `main-category/${id}_${Date.now()}.${ext}`;
      await this.minioService.uploadToPath(image, fileName);
      update.imagePath = fileName;
    }
    const updated = await this.mainCategoryModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Main category not found');
    let imageUrl = null;
    if (updated.imagePath) {
      const presigned = await this.minioService.getPresignedUrl(
        updated.imagePath,
      );
      imageUrl = this.presignedUrlToRelativePath(presigned);
    }
    return {
      _id: updated._id.toString(),
      mainCategoryName: updated.mainCategoryName,
      imagePath: imageUrl,
    };
  }

  async deleteMainCategory(id: string) {
    const deleted = await this.mainCategoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Main category not found');
    return { message: 'Main category deleted' };
  }

  // Sub Category CRUD
  async createSubCategory(dto: {
    subCategoryName: string;
    mainCategoryId: string;
  }) {
    if (!dto.subCategoryName || !dto.mainCategoryId)
      throw new BadRequestException(
        'subCategoryName and mainCategoryId are required',
      );
    const mainCat = await this.mainCategoryModel.findById(dto.mainCategoryId);
    if (!mainCat) throw new NotFoundException('Main category not found');
    const exists = await this.subCategoryModel.findOne({
      subCategoryName: dto.subCategoryName.trim(),
      mainCategoryId: dto.mainCategoryId,
    });
    if (exists)
      throw new BadRequestException(
        'Sub category already exists for this main category',
      );
    const created = new this.subCategoryModel({
      subCategoryName: dto.subCategoryName.trim(),
      mainCategoryId: dto.mainCategoryId,
    });
    await created.save();
    return {
      _id: created._id.toString(),
      subCategoryName: created.subCategoryName,
      mainCategoryId: created.mainCategoryId,
    };
  }

  // Type guard for populated MainCategory
  private isPopulatedMainCategory(
    obj: any,
  ): obj is MainCategory & { _id: any } {
    return (
      obj &&
      typeof obj === 'object' &&
      '_id' in obj &&
      'mainCategoryName' in obj
    );
  }

  async getSubCategories() {
    const subCats = await this.subCategoryModel
      .find()
      .populate('mainCategoryId')
      .exec();
    return subCats.map((sub) => {
      let mainCategoryId;
      let mainCategoryName: string | undefined;
      const mainCat = sub.mainCategoryId;
      if (this.isPopulatedMainCategory(mainCat)) {
        mainCategoryId = mainCat._id?.toString?.() || String(mainCat._id);
        mainCategoryName = mainCat.mainCategoryName;
      } else if (mainCat) {
        mainCategoryId = String(mainCat);
      } else {
        mainCategoryId = '';
      }
      return {
        _id: sub._id.toString(),
        subCategoryName: sub.subCategoryName,
        mainCategoryId,
        mainCategoryName,
      };
    });
  }

  async updateSubCategory(
    id: string,
    dto: { subCategoryName?: string; mainCategoryId?: string },
  ) {
    const update: any = {};
    if (dto.subCategoryName)
      update.subCategoryName = dto.subCategoryName.trim();
    if (dto.mainCategoryId) {
      const mainCat = await this.mainCategoryModel.findById(dto.mainCategoryId);
      if (!mainCat) throw new NotFoundException('Main category not found');
      update.mainCategoryId = dto.mainCategoryId;
    }
    const updated = await this.subCategoryModel.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!updated) throw new NotFoundException('Sub category not found');
    return {
      _id: updated._id.toString(),
      subCategoryName: updated.subCategoryName,
      mainCategoryId: updated.mainCategoryId,
    };
  }

  async deleteSubCategory(id: string) {
    const deleted = await this.subCategoryModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Sub category not found');
    return { message: 'Sub category deleted' };
  }

  async getSubCategoriesByMainCategory(mainCategoryId: string) {
    if (!mainCategoryId) {
      throw new BadRequestException('mainCategoryId is required');
    }
    // Validate mainCategoryId is a valid ObjectId
    if (!mainCategoryId.match(/^[a-fA-F0-9]{24}$/)) {
      throw new BadRequestException('Invalid mainCategoryId');
    }
    const subCategories = await this.subCategoryModel
      .find({ mainCategoryId })
      .exec();
    return subCategories.map((sub) => ({
      _id: sub._id.toString(),
      subCategoryName: sub.subCategoryName,
      mainCategoryId: sub.mainCategoryId.toString(),
    }));
  }
}

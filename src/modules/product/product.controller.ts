import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Query,
  Logger,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/product.schema';
import { ProductService } from './product.service';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { CapacityService } from './capacity.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppError } from '../../common/errors';
import { GenderService } from './gender.service';
import { CreateGenderDto, UpdateGenderDto } from './dto/gender.dto';
import { isValidObjectId } from 'mongoose';
import { ParseJsonFieldsPipe } from '../../common/pipes/parse-json-fields.pipe';
import { ApiQuery } from '@nestjs/swagger';
import { AdminOrUserGuard } from '../../guards/admin-or-user.guard';

@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);
  constructor(
    private readonly productService: ProductService,
    private readonly capacityService: CapacityService,
    private readonly genderService: GenderService,
  ) {}

  @UseGuards(AdminAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('productImage'))
  async create(
    @Body(new ParseJsonFieldsPipe(['category', 'variants', 'tags']))
    createProductDto: CreateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productService.create(createProductDto, image);
  }

  // Remove guard for GET endpoints so both admin and base users can call them
  @UseGuards(AdminOrUserGuard)
  @Get()
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [0, 1],
    description: 'Product status (0=inactive, 1=active)',
  })
  findAll(
    @Query('productType') productType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    // Accept categories either as a comma-separated string or as repeated query params (string[])
    @Query('categories') categories?: string | string[],
    @Query('tag') tag?: string,
    @Query('gender') gender?: string,
    @Query('status') status?: string,
    // Optional visible param: '0' or '1' to explicitly filter. If omitted and status is provided, visible=1 will be applied by default.
    @Query('visible') visible?: string,
  ) {
    // Convert status, limit, and page to numbers if provided
    const statusNum = status !== undefined ? Number(status) : undefined;
    const limitNum = limit !== undefined ? Number(limit) : undefined;
    const pageNum = page !== undefined ? Number(page) : undefined;
    // Convert categories to string array if provided
    let categoriesArr: string[] | undefined;
    if (Array.isArray(categories)) {
      categoriesArr = (categories as string[])
        .map((c) => c.trim())
        .filter(Boolean);
    } else if (typeof categories === 'string' && categories.trim().length > 0) {
      categoriesArr = categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    } else {
      categoriesArr = undefined;
    }
    // Note: findAll was changed to always query DB (no cached-only results) and to return products regardless of `visible` flag (both 0 and 1).
    return this.productService.findAll(
      productType,
      search,
      limitNum,
      pageNum,
      categoriesArr,
      tag,
      gender,
      statusNum,
      visible,
    );
  }

  @UseGuards(AdminAuthGuard)
  @Post('categories')
  async addCategory(@Body('categoryName') name: string) {
    return this.productService.addCategory(name);
  }

  @UseGuards(AdminOrUserGuard)
  @Get('categories')
  async listCategories() {
    const categories = await this.productService.listCategories();
    return categories.map((cat: any) => ({
      id: cat._id?.toString?.() ?? cat.id,
      name: cat.categoryName ?? cat.name ?? cat,
    }));
  }

  @UseGuards(AdminOrUserGuard)
  @Get('capacities')
  async getCapacities() {
    return await this.capacityService.getCapacities();
  }

  @UseGuards(AdminAuthGuard)
  @Post('capacities')
  async addCapacity(@Body('capacity') capacity: any) {
    if (
      capacity === undefined ||
      capacity === null ||
      capacity === '' ||
      isNaN(Number(capacity))
    ) {
      throw new NotFoundException(AppError.CAPACITY_MUST_BE_NUMBER.az);
    }
    try {
      const result = await this.capacityService.addCapacity(Number(capacity));
      return { statusCode: 201, capacities: result };
    } catch (error) {
      return {
        statusCode: 500,
        message: AppError.FAILED_ADD_CAPACITY.az,
        error: error?.message || error,
      };
    }
  }

  // Product Type CRUD
  @UseGuards(AdminOrUserGuard)
  @Get('types')
  async getProductTypes() {
    return this.productService.getProductTypes();
  }

  @UseGuards(AdminAuthGuard)
  @Post('types')
  async createProductType(@Body('name') name: string) {
    return this.productService.createProductType(name);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('types/:id')
  async updateProductType(@Param('id') id: string, @Body('name') name: string) {
    return this.productService.updateProductType(id, name);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('types/:id')
  async deleteProductType(@Param('id') id: string) {
    return this.productService.deleteProductType(id);
  }

  // Move all static routes above this
  @UseGuards(AdminAuthGuard)
  @Post('genders')
  async addGender(@Body() dto: CreateGenderDto) {
    return this.genderService.create(dto);
  }

  @UseGuards(AdminOrUserGuard)
  @Get('genders')
  async listGenders() {
    return this.genderService.findAll();
  }

  @UseGuards(AdminAuthGuard)
  @Patch('genders/:id')
  async updateGender(@Param('id') id: string, @Body() dto: UpdateGenderDto) {
    return this.genderService.update(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('genders/:id')
  async deleteGender(@Param('id') id: string) {
    this.genderService.delete(id);
    return { statusCode: 200, message: 'Gender deleted' };
  }

  @UseGuards(AdminOrUserGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Invalid product id');
    }
    return this.productService.findOne(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('productImage'))
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    this.logger.log(
      `Received update request for id=${id}. Image present: ${!!image}, filename: ` +
        image?.originalname,
    );
    if (typeof updateProductDto.variants === 'string') {
      try {
        updateProductDto.variants = JSON.parse(updateProductDto.variants);
      } catch (e) {
        updateProductDto.variants = undefined;
      }
    }
    // Parse quantity if present and stringified
    if (typeof updateProductDto.quantity === 'string') {
      const parsed = Number(updateProductDto.quantity);
      updateProductDto.quantity = isNaN(parsed) ? undefined : parsed;
    }
    return await this.productService.update(id, updateProductDto, image);
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('capacities/:id')
  async updateCapacity(
    @Param('id') id: string,
    @Body('capacity') capacity: any,
  ) {
    if (
      capacity === undefined ||
      capacity === null ||
      capacity === '' ||
      isNaN(Number(capacity))
    ) {
      throw new NotFoundException(AppError.CAPACITY_MUST_BE_NUMBER.az);
    }
    try {
      const result = await this.capacityService.updateCapacity(
        id,
        Number(capacity),
      );
      return { statusCode: 200, capacities: result };
    } catch (error) {
      return {
        statusCode: 404,
        message: AppError.FAILED_UPDATE_CAPACITY.az,
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Delete('capacities/:id')
  async deleteCapacity(@Param('id') id: string) {
    try {
      const result = await this.capacityService.deleteCapacity(id);
      return { statusCode: 200, capacities: result };
    } catch (error) {
      return {
        statusCode: 404,
        message: AppError.FAILED_DELETE_CAPACITY.az,
      };
    }
  }

  @UseGuards(AdminAuthGuard)
  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body('categoryName') categoryName: string,
  ) {
    return this.productService.updateCategory(id, categoryName);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.productService.deleteCategory(id);
  }

  @UseGuards(AdminOrUserGuard)
  @Get('by-brand/:brandId')
  async getByBrand(
    @Param('brandId') brandId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('visible') visible?: string,
  ) {
    return this.productService.findByBrand(
      brandId,
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1,
      visible,
    );
  }

  @UseGuards(AdminOrUserGuard)
  @Get('by-tag/:tag')
  async getByTag(
    @Param('tag') tag: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.productService.findByTag(
      tag,
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1,
    );
  }

  @UseGuards(AdminOrUserGuard)
  @Get('search')
  async searchProducts(
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.productService.searchByProductName(
      query,
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1,
    );
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}

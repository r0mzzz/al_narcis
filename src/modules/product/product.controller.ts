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
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto';
import {
  CreateMainCategoryDto,
  UpdateMainCategoryDto,
} from './dto/main-category.dto';
import {
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
} from './dto/sub-category.dto';

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
    @Query('mainCategory') mainCategory?: string, // <-- add this
    @Query('subCategory') subCategory?: string, // <-- add this
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
      mainCategory, // <-- pass to service
      subCategory, // <-- pass to service
    );
  }

  @UseGuards(AdminAuthGuard)
  @Post('categories')
  async addCategory(@Body('categoryName') name: string) {
    return this.productService.addCategory(name);
  }

  @Get('categories')
  async listCategories() {
    const categories = await this.productService.listCategories();
    return categories.map((cat: any) => ({
      id: cat._id?.toString?.() ?? cat.id,
      name: cat.categoryName ?? cat.name ?? cat,
    }));
  }

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

  @Get('sections')
  async getSections() {
    return this.productService.getSections();
  }

  @UseGuards(AdminOrUserGuard)
  @Post('sections')
  async createSection(@Body() dto: CreateSectionDto) {
    return this.productService.createSection(dto);
  }

  @UseGuards(AdminOrUserGuard)
  @Patch('sections/:id')
  async updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) {
    return this.productService.updateSection(id, dto);
  }

  @UseGuards(AdminOrUserGuard)
  @Delete('sections/:id')
  async deleteSection(@Param('id') id: string) {
    return this.productService.deleteSection(id);
  }

  @Get('main-categories')
  async getMainCategories() {
    return this.productService.getMainCategories();
  }

  @Get('sub-categories')
  async getSubCategories() {
    return this.productService.getSubCategories();
  }

  @Get('sub-categories/by-main/:mainCategoryId')
  async getSubCategoriesByMainCategory(@Param('mainCategoryId') mainCategoryId: string) {
    return this.productService.getSubCategoriesByMainCategory(mainCategoryId);
  }

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

  @Get('by-brand/:brandId')
  async getByBrand(
    @Param('brandId') brandId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('visible') visible?: string,
    @Query('search') search?: string, // <-- add search query param
  ) {
    return this.productService.findByBrand(
      brandId,
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1,
      visible,
      search, // <-- pass search to service
    );
  }

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

  // Main Category CRUD
  @UseGuards(AdminAuthGuard)
  @Post('main-categories')
  async createMainCategory(@Body() dto: CreateMainCategoryDto) {
    return this.productService.createMainCategory(dto);
  }
  @UseGuards(AdminAuthGuard)
  @Patch('main-categories/:id')
  @UseInterceptors(FileInterceptor('image'))
  async updateMainCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMainCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productService.updateMainCategory(id, dto, image);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('main-categories/:id')
  async deleteMainCategory(@Param('id') id: string) {
    return this.productService.deleteMainCategory(id);
  }

  // Sub Category CRUD
  @UseGuards(AdminAuthGuard)
  @Post('sub-categories')
  async createSubCategory(@Body() dto: CreateSubCategoryDto) {
    return this.productService.createSubCategory(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('sub-categories/:id')
  async updateSubCategory(
    @Param('id') id: string,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.productService.updateSubCategory(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Delete('sub-categories/:id')
  async deleteSubCategory(@Param('id') id: string) {
    return this.productService.deleteSubCategory(id);
  }
}

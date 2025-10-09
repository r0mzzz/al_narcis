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
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { CapacityService } from './capacity.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppError } from '../../common/errors';
import { GenderService } from './gender.service';
import { CreateGenderDto, UpdateGenderDto } from './dto/gender.dto';

@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);
  constructor(
    private readonly productService: ProductService,
    private readonly capacityService: CapacityService,
    private readonly genderService: GenderService,
  ) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  @UseInterceptors(FileInterceptor('productImage'))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    this.logger.log(
      `Received create request. Image present: ${!!image}, filename: ` +
        image?.originalname,
    );
    return await this.productService.create(createProductDto, image);
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  findAll(
    @Query('productType') productType?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('categories') categories?: string,
    @Query('tag') tag?: string,
    @Query('genderType') genderType?: string,
  ) {
    // Parse categories as array if provided
    const categoryArr = categories
      ? categories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : undefined;
    return this.productService.findAll(
      productType,
      search,
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1,
      categoryArr,
      tag,
      genderType,
    );
  }

  @UseGuards(AccessTokenGuard)
  @Post('categories')
  async addCategory(@Body('categoryName') name: string) {
    return this.productService.addCategory(name);
  }

  @UseGuards(AccessTokenGuard)
  @Get('categories')
  async listCategories() {
    return this.productService.listCategories();
  }

  @UseGuards(AccessTokenGuard)
  @Get('capacities')
  async getCapacities() {
    return await this.capacityService.getCapacities();
  }

  @UseGuards(AccessTokenGuard)
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
  @UseGuards(AccessTokenGuard)
  @Get('types')
  async getProductTypes() {
    return this.productService.getProductTypes();
  }

  @UseGuards(AccessTokenGuard)
  @Post('types')
  async createProductType(@Body('name') name: string) {
    return this.productService.createProductType(name);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('types/:id')
  async updateProductType(@Param('id') id: string, @Body('name') name: string) {
    return this.productService.updateProductType(id, name);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('types/:id')
  async deleteProductType(@Param('id') id: string) {
    return this.productService.deleteProductType(id);
  }

  @UseGuards(AccessTokenGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @UseGuards(AccessTokenGuard)
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

  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @UseGuards(AccessTokenGuard)
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

  @UseGuards(AccessTokenGuard)
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

  @UseGuards(AccessTokenGuard)
  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body('categoryName') categoryName: string,
  ) {
    return this.productService.updateCategory(id, categoryName);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.productService.deleteCategory(id);
  }

  @UseGuards(AccessTokenGuard)
  @Get('by-brand/:brandId')
  async getByBrand(
    @Param('brandId') brandId: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.productService.findByBrand(
      brandId,
      limit ? parseInt(limit, 10) : 10,
      page ? parseInt(page, 10) : 1,
    );
  }

  @UseGuards(AccessTokenGuard)
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

  @UseGuards(AccessTokenGuard)
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

  @UseGuards(AccessTokenGuard)
  @Post('genders')
  async addGender(@Body() dto: CreateGenderDto) {
    return this.genderService.create(dto);
  }

  @UseGuards(AccessTokenGuard)
  @Get('genders')
  async listGenders() {
    return this.genderService.findAll();
  }

  @UseGuards(AccessTokenGuard)
  @Patch('genders/:id')
  async updateGender(@Param('id') id: string, @Body() dto: UpdateGenderDto) {
    return this.genderService.update(id, dto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('genders/:id')
  async deleteGender(@Param('id') id: string) {
    this.genderService.delete(id);
    return { statusCode: 200, message: 'Gender deleted' };
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

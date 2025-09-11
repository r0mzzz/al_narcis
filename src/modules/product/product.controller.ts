import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/product.schema';
import { ProductService } from './product.service';
import { AccessTokenGuard } from '../../guards/jwt-guard';
import { CapacityService } from './capacity.service';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly capacityService: CapacityService,
  ) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  findAll() {
    return this.productService.findAll();
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
      return {
        statusCode: 400,
        message: 'Capacity must be a non-empty number',
      };
    }
    try {
      const result = await this.capacityService.addCapacity(Number(capacity));
      return { statusCode: 201, capacities: result };
    } catch (error) {
      return {
        statusCode: 500,
        message: 'Failed to add capacity',
        error: error?.message || error,
      };
    }
  }

  @UseGuards(AccessTokenGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @UseGuards(AccessTokenGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
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

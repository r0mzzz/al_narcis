import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandsService } from './brands.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

function mapBrandResponse(brand: any, presignedUrl?: string) {
  return {
    ...brand.toObject(),
    imageUrl: presignedUrl || null,
  };
}

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @UploadedFile() image: Express.Multer.File,
    @Body() createBrandDto: CreateBrandDto,
  ) {
    const brand = await this.brandsService.create(createBrandDto, image);
    let presignedUrl = null;
    if (brand.imagePath) {
      presignedUrl = await this.brandsService.getPresignedImageUrl(
        brand.imagePath,
      );
    }
    return mapBrandResponse(brand, presignedUrl);
  }

  @Get()
  async findAll() {
    const brands = await this.brandsService.findAll();
    return Promise.all(
      brands.map(async (brand) => {
        let presignedUrl = null;
        if (brand.imagePath) {
          presignedUrl = await this.brandsService.getPresignedImageUrl(
            brand.imagePath,
          );
        }
        return mapBrandResponse(brand, presignedUrl);
      }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const brand = await this.brandsService.findById(id);
    let presignedUrl = null;
    if (brand.imagePath) {
      presignedUrl = await this.brandsService.getPresignedImageUrl(
        brand.imagePath,
      );
    }
    return mapBrandResponse(brand, presignedUrl);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    const brand = await this.brandsService.update(id, updateBrandDto, image);
    let presignedUrl = null;
    if (brand.imagePath) {
      presignedUrl = await this.brandsService.getPresignedImageUrl(
        brand.imagePath,
      );
    }
    return mapBrandResponse(brand, presignedUrl);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.brandsService.delete(id);
    return;
  }
}

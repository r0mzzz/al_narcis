import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannerService } from './banner.service';
import { AccessTokenGuard } from '../../guards/jwt-guard';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(@UploadedFile() image?: Express.Multer.File) {
    const banner = await this.bannerService.create(image);
    let imageUrl = null;
    if (banner.imagePath) {
      imageUrl = await this.bannerService.getPresignedImageUrl(
        banner.imagePath,
      );
    }
    return { id: banner._id, imageUrl };
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  async findAll() {
    const banners = await this.bannerService.findAll();
    // Return array of objects with at least imageUrl as requested
    return banners.map((b) => ({ imageUrl: b.imageUrl, id: b._id }));
  }

  @UseGuards(AccessTokenGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const banner = await this.bannerService.update(id, image);
    let imageUrl = null;
    if (banner.imagePath) {
      imageUrl = await this.bannerService.getPresignedImageUrl(
        banner.imagePath,
      );
    }
    return { id: banner._id, imageUrl };
  }

  @UseGuards(AccessTokenGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.bannerService.remove(id);
    return;
  }
}

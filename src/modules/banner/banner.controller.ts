import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannerService } from './banner.service';
import { AdminAuthGuard } from '../../guards/admin-auth.guard';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @UseGuards(AdminAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const banner = await this.bannerService.create(image, createBannerDto.link);
    let imageUrl = null;
    if (banner.imagePath) {
      imageUrl = await this.bannerService.getPresignedImageUrl(
        banner.imagePath,
      );
    }
    return { id: banner._id, imageUrl, link: banner.link || null };
  }

  @Get()
  async findAll() {
    const banners = await this.bannerService.findAll();
    // Return array of objects with imageUrl, id, and link
    return banners.map((b) => ({
      imageUrl: b.imageUrl,
      id: b._id,
      link: b.link,
    }));
  }

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const banner = await this.bannerService.update(
      id,
      image,
      updateBannerDto.link,
    );
    let imageUrl = null;
    if (banner.imagePath) {
      imageUrl = await this.bannerService.getPresignedImageUrl(
        banner.imagePath,
      );
    }
    return { id: banner._id, imageUrl, link: banner.link || null };
  }

  @UseGuards(AdminAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.bannerService.remove(id);
    return;
  }
}

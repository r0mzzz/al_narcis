import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './schema/banner.schema';
import { MinioService } from '../../services/minio.service';

@Injectable()
export class BannerService {
  private readonly logger = new Logger(BannerService.name);

  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
    private readonly minioService: MinioService,
  ) {}

  async create(file?: Express.Multer.File, link?: string) {
    const banner = new this.bannerModel({ link: link || null });
    await banner.save();

    if (file) {
      const folder = `banners/${banner._id}`;
      const objectId = `image_${Date.now()}`;
      banner.imagePath = await this.minioService.uploadFile(
        file,
        folder,
        objectId,
      );
      banner.folder = folder;
      await banner.save();
    }

    return banner;
  }

  async findAll() {
    const banners = await this.bannerModel.find().lean();
    return await Promise.all(
      banners.map(async (b) => {
        let imageUrl = null;
        if (b.imagePath) {
          imageUrl = await this.getPresignedImageUrl(b.imagePath);
        }
        return {
          imageUrl,
          _id: b._id,
          link: b.link || null,
        };
      }),
    );
  }

  async update(id: string, file?: Express.Multer.File, link?: string) {
    const banner = await this.bannerModel.findById(id);
    if (!banner) throw new NotFoundException('Banner not found');

    // Update link if provided
    if (link !== undefined) {
      banner.link = link || null;
    }

    if (file) {
      // remove old image if exists
      if (banner.imagePath) {
        try {
          await this.minioService.removeObject(banner.imagePath);
        } catch (err) {
          this.logger.error('Failed to remove old banner image', String(err));
        }
      }
      const folder = banner.folder || `banners/${banner._id}`;
      const objectId = `image_${Date.now()}`;
      banner.imagePath = await this.minioService.uploadFile(
        file,
        folder,
        objectId,
      );
      banner.folder = folder;
    }

    await banner.save();
    return banner;
  }

  async remove(id: string) {
    const banner = await this.bannerModel.findById(id);
    if (!banner) throw new NotFoundException('Banner not found');
    if (banner.imagePath) {
      try {
        await this.minioService.removeObject(banner.imagePath);
      } catch (err) {
        this.logger.error(
          'Failed to remove banner image during delete',
          String(err),
        );
      }
    }
    await this.bannerModel.deleteOne({ _id: id });
    return { success: true };
  }

  async getPresignedImageUrl(
    objectPath?: string | null,
    expirySeconds = 60 * 60,
  ) {
    if (!objectPath) return null;
    try {
      return await this.minioService.getPresignedUrl(objectPath, expirySeconds);
    } catch (err) {
      this.logger.error(
        'Failed to get presigned url for ' + String(objectPath),
        String(err),
      );
      return null;
    }
  }
}

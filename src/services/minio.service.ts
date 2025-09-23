import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  private readonly minioClient: Client;
  private readonly bucket: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    const minioConfig = this.configService.get('minio');
    this.bucket = minioConfig.bucket;
    this.minioClient = new Client({
      endPoint: minioConfig.endPoint,
      port: minioConfig.port,
      useSSL: minioConfig.useSSL,
      accessKey: minioConfig.accessKey,
      secretKey: minioConfig.secretKey,
    });
    this.ensureBucket();
  }

  private async ensureBucket() {
    const exists = await this.minioClient
      .bucketExists(this.bucket)
      .catch(() => false);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucket, 'us-east-1');
      this.logger.log(`Bucket ${this.bucket} created.`);
    }
  }

  async upload(
    file: Express.Multer.File,
    productName: string,
    productId: string,
  ): Promise<string> {
    const fileExtension = this.getFileExtension(file.originalname);
    const baseName = file.originalname.replace(fileExtension, '');
    const fileName = `products/${productName}-${productId}/${baseName}${fileExtension}`;

    const metaData = {
      'Content-Type': file.mimetype,
    };

    try {
      await this.minioClient.putObject(
        this.bucket,
        fileName,
        Readable.from(file.buffer),
        file.size,
        metaData,
      );
      this.logger.log(`File uploaded to bucket ${this.bucket} as ${fileName}`);
    } catch (err) {
      this.logger.error(`Failed to upload file to Minio: ${err}`);
      throw err;
    }

    const url = `http://94.20.222.102:9000/${this.bucket}/${encodeURIComponent(
      fileName,
    )}`;
    this.logger.log(`Returning file URL: ${url}`);
    return url;
  }

  /**
   * Returns an array of image URLs for a given product.
   * @param productName The name of the product.
   * @param productId The ID of the product.
   * @returns Promise<string[]> Array of image URLs.
   */
  async getProductImages(
    productName: string,
    productId: string,
    expiry = 60 * 60,
  ): Promise<string[]> {
    const prefix = `products/${productName}-${productId}/`;
    const imageUrls: string[] = [];
    try {
      const stream = this.minioClient.listObjectsV2(this.bucket, prefix, true);
      for await (const obj of stream) {
        if (obj.name) {
          const presignedUrl = await this.getPresignedUrl(obj.name, expiry);
          imageUrls.push(presignedUrl);
        }
      }
      return imageUrls;
    } catch (err) {
      throw err;
    }
  }

  async getPresignedUrl(objectName: string, expiry = 60 * 60): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(this.bucket, objectName, expiry);
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for ${objectName}: ${error}`);
      throw error;
    }
  }

  private getFileExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.substring(idx) : '';
  }
}

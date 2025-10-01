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
    productId: string,
  ): Promise<string> {
    const fileExtension = this.getFileExtension(file.originalname);
    const fileName = `products/${productId}${fileExtension}`;
    const metaData = {
      'Content-Type': file.mimetype,
    };
    this.logger.log(`Preparing to upload file to Minio: bucket=${this.bucket}, fileName=${fileName}, size=${file.size}, mimetype=${file.mimetype}`);
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
    // Return only the object path, not the full URL
    return fileName;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    objectId: string,
  ): Promise<string> {
    const fileExtension = this.getFileExtension(file.originalname);
    const fileName = `${folder}/${objectId}${fileExtension}`;
    const metaData = {
      'Content-Type': file.mimetype,
    };
    this.logger.log(`Preparing to upload file to Minio: bucket=${this.bucket}, fileName=${fileName}, size=${file.size}, mimetype=${file.mimetype}`);
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
    return fileName;
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

  async delete(objectPath: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, objectPath);
      this.logger.log(`Deleted file from Minio: ${objectPath}`);
    } catch (err) {
      this.logger.error(`Failed to delete file from Minio: ${err}`);
      throw err;
    }
  }

  private getFileExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex !== -1 ? filename.substring(dotIndex) : '';
  }
}

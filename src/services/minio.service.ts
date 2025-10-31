import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  private readonly minioClient: Client;
  private readonly bucket: string;
  private readonly logger = new Logger(MinioService.name);
  // Simple in-memory cache: objectName -> { url, expiresAt }
  private presignedCache: Map<string, { url: string; expiresAt: number }> =
    new Map();

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

  async upload(file: Express.Multer.File, productId: string): Promise<string> {
    const fileExtension = this.getFileExtension(file.originalname);
    const fileName = `products/${productId}${fileExtension}`;
    const metaData = {
      'Content-Type': file.mimetype,
    };
    this.logger.log(
      `Preparing to upload file to Minio: bucket=${this.bucket}, fileName=${fileName}, size=${file.size}, mimetype=${file.mimetype}`,
    );
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
    this.logger.log(
      `Preparing to upload file to Minio: bucket=${this.bucket}, fileName=${fileName}, size=${file.size}, mimetype=${file.mimetype}`,
    );
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

  async uploadToPath(file: Express.Multer.File, path: string): Promise<void> {
    const metaData = {
      'Content-Type': file.mimetype,
    };
    this.logger.log(
      `Uploading file to Minio: bucket=${this.bucket}, path=${path}, size=${file.size}, mimetype=${file.mimetype}`,
    );
    try {
      await this.minioClient.putObject(
        this.bucket,
        path,
        Readable.from(file.buffer),
        file.size,
        metaData,
      );
      this.logger.log(`File uploaded to bucket ${this.bucket} as ${path}`);
    } catch (err) {
      this.logger.error(`Failed to upload file to Minio: ${err}`);
      throw err;
    }
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
      let url = await this.minioClient.presignedGetObject(
        this.bucket,
        objectName,
        expiry,
      );

      // Переписываем URL чтобы не было mixed content
      url = url
        .replace(
          `http://${this.configService.get(
            'minio.endPoint',
          )}:${this.configService.get('minio.port')}`,
          `https://api.alnarcis.az`,
        )
        .replace(`http://188.132.197.211:9000`, `https://api.alnarcis.az`);

      // Если вдруг MinIO добавил прям путь
      url = url.replace(`/${this.bucket}/`, `/product-images/`);

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${objectName}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Returns a presigned URL, but uses an in-memory cache to avoid regenerating
   * a new URL on every request. If the cached URL will expire within
   * refreshBufferSeconds, a new URL is generated and cached.
   *
   * Note: in-memory cache is per-process and will be lost on restart. If you
   * need cross-process caching, use Redis or another external cache.
   */
  async getCachedPresignedUrl(
    objectName: string,
    expiry = 60 * 60,
    refreshBufferSeconds = 120,
  ): Promise<string> {
    if (!objectName) return null;
    const now = Date.now();
    const cached = this.presignedCache.get(objectName);
    if (cached) {
      // If cached URL still valid and not within the refresh buffer, return it
      if (cached.expiresAt - now > refreshBufferSeconds * 1000) {
        return cached.url;
      }
    }
    // Generate new presigned URL and cache it
    try {
      const url = await this.getPresignedUrl(objectName, expiry);
      const expiresAt = Date.now() + expiry * 1000;
      this.presignedCache.set(objectName, { url, expiresAt });
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate cached presigned URL for ${objectName}: ${error}`,
      );
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

  async removeObject(objectPath: string): Promise<void> {
    return this.delete(objectPath);
  }

  private getFileExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex !== -1 ? filename.substring(dotIndex) : '';
  }
}

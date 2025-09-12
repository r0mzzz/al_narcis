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

  async upload(file: Express.Multer.File, productId: string): Promise<string> {
    const fileExtension = this.getFileExtension(file.originalname);
    const baseName = file.originalname.replace(fileExtension, '');
    const fileName = `products/${productId}/${baseName}${fileExtension}`;

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

    const url = `http://localhost:9000/${this.bucket}/${encodeURIComponent(
      fileName,
    )}`;
    this.logger.log(`Returning file URL: ${url}`);
    return url;
  }

  private getFileExtension(filename: string): string {
    const idx = filename.lastIndexOf('.');
    return idx !== -1 ? filename.substring(idx) : '';
  }
}

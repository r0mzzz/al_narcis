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

  async upload(file: Express.Multer.File): Promise<string> {
    this.logger.log(`Uploading file: ${file.originalname}, size: ${file.size}`);
    const fileName = `${Date.now()}-${file.originalname}`;
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
    const url = `${this.configService.get('minio').endPoint}:${
      this.configService.get('minio').port
    }/${this.bucket}/${fileName}`;
    this.logger.log(`Returning file URL: ${url}`);
    return url;
  }
}

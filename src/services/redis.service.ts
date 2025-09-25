import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private logger = new Logger(RedisService.name);

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // Очистка кэша при старте (по желанию через .env)
    try {
      const purge = (
        process.env.REDIS_PURGE_PRODUCTS_CACHE || ''
      ).toLowerCase();
      if (purge === '1' || purge === 'true' || purge === 'yes') {
        await this.delByPattern('products:list*');
      }
    } catch (e) {
      this.logger.debug(
        'Failed to purge products cache on startup: ' + e?.message,
      );
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({
      match: pattern,
      count: 100,
    });

    const keysToDelete: string[] = [];

    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        keysToDelete.push(...keys);
      }
    });

    await new Promise<void>((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keysToDelete.length > 0) {
      await this.client.del(...keysToDelete);
    }
  }


  async del(key: string) {
    await this.client.del(key);
  }

  async flushAll() {
    await this.client.flushall();
  }
}

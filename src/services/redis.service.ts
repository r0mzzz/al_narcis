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

  // Delete keys by pattern (use with care in production)
  async delByPattern(pattern: string) {
    if (!this.client) return;

    try {
      // Prefer KEYS for simplicity; fallback to scanStream if necessary.
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(`Deleted ${keys.length} Redis keys matching pattern "${pattern}"`);
        return;
      }
      // no keys found with KEYS
      this.logger.debug(`No Redis keys found for pattern "${pattern}" using KEYS()`);
    } catch (e) {
      this.logger.debug(`Redis KEYS() failed for pattern "${pattern}": ${e?.message}. Falling back to scanStream.`);
    }

    // Fallback: use scanStream to avoid blocking Redis on large keyspaces
    return new Promise<void>((resolve, reject) => {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const pipeline = this.client.pipeline();
      let found = 0;

      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          found += keys.length;
          keys.forEach((key) => pipeline.del(key));
        }
      });

      stream.on('end', async () => {
        try {
          if (found > 0) {
            await pipeline.exec();
            this.logger.log(`Deleted ${found} Redis keys matching pattern "${pattern}" using scanStream`);
          } else {
            this.logger.debug(`No Redis keys matched pattern "${pattern}" during scan`);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async flushAll() {
    await this.client.flushall();
  }
}

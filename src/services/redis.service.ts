import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private logger: Logger

  async onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // Optionally purge products list cache at startup to avoid serving stale data.
    // Set REDIS_PURGE_PRODUCTS_CACHE=true in .env to enable.
    try {
      const purge = (
        process.env.REDIS_PURGE_PRODUCTS_CACHE || ''
      ).toLowerCase();
      if (purge === '1' || purge === 'true' || purge === 'yes') {
        await this.delByPattern('products:list*');
      }
    } catch (e) {
      this.logger.debug('Failed to purge products cache on startup: ' + e?.message);
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  async setJson(key: string, value: any, ttlSeconds?: number) {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string) {
    await this.client.del(key);
  }

  // Delete keys by pattern (use with care in production)
  async delByPattern(pattern: string) {
    if (!this.client) return;
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const pipeline = this.client.pipeline();
    let found = 0;
    for await (const keys of stream) {
      if (keys.length) {
        found += keys.length;
        keys.forEach((k: string) => pipeline.del(k));
      }
    }
    if (found > 0) {
      await pipeline.exec();
    }
  }
}

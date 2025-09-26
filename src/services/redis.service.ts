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
    let host = process.env.REDIS_HOST || 'redis';
    host = host.replace(/^https?:\/\//, '').split(':')[0];
    this.client = new Redis({
      host,
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

  // --- Simple string helpers ---
  async get(key: string): Promise<string | null> {
    try {
      const val = await this.client.get(key);
      return val;
    } catch (err) {
      this.logger.error(
        `Redis GET (raw) failed for key=${key}: ${err?.message || err}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.error(
        `Redis SET (raw) failed for key=${key}: ${err?.message || err}`,
      );
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const v = await this.client.incr(key);
      return v;
    } catch (err) {
      this.logger.error(
        `Redis INCR failed for key=${key}: ${err?.message || err}`,
      );
      throw err;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (data) {
        this.logger.debug(`Redis GET hit for key=${key}`);
        return JSON.parse(data);
      }
      this.logger.debug(`Redis GET miss for key=${key}`);
      return null;
    } catch (err) {
      this.logger.error(
        `Redis GET failed for key=${key}: ${err?.message || err}`,
      );
      return null;
    }
  }

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const data = JSON.stringify(value);
    try {
      if (ttlSeconds) {
        await this.client.set(key, data, 'EX', ttlSeconds);
        this.logger.log(`Redis SET key=${key} TTL=${ttlSeconds}s`);
      } else {
        await this.client.set(key, data);
        this.logger.log(`Redis SET key=${key} (no TTL)`);
      }
    } catch (err) {
      this.logger.error(
        `Redis SET failed for key=${key}: ${err?.message || err}`,
      );
    }
  }

  async delByPattern(pattern: string): Promise<number> {
    if (!this.client) return 0;

    try {
      // Try KEYS first (fast for small namespaces)
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(...keys);
        this.logger.log(
          `Deleted ${keys.length} Redis keys matching pattern "${pattern}" using KEYS()`,
        );
        return keys.length;
      }
    } catch (e) {
      this.logger.debug(
        `Redis KEYS() failed for pattern "${pattern}": ${e?.message}. Falling back to scanStream.`,
      );
    }

    try {
      // Fallback: use scanStream to collect keys without blocking Redis
      const stream = this.client.scanStream({ match: pattern, count: 500 });
      const pipeline = this.client.pipeline();
      let found = 0;

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          if (keys.length) {
            found += keys.length;
            keys.forEach((k) => pipeline.del(k));
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (found > 0) {
        await pipeline.exec();
        this.logger.log(
          `Deleted ${found} Redis keys matching pattern "${pattern}" using scanStream`,
        );
      } else {
        this.logger.debug(`No Redis keys matched pattern "${pattern}"`);
      }
      return found;
    } catch (err) {
      this.logger.error(
        `Failed to delete Redis keys for pattern "${pattern}": ${
          err?.message || err
        }`,
      );
      throw err;
    }
  }

  async del(key: string) {
    try {
      await this.client.del(key);
      this.logger.debug(`Deleted Redis key=${key}`);
    } catch (err) {
      this.logger.error(
        `Failed to delete Redis key=${key}: ${err?.message || err}`,
      );
    }
  }

  async flushAll() {
    await this.client.flushall();
  }
}

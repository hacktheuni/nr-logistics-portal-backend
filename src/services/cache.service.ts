
import Redis from 'ioredis';
import { config } from '../config/env';

class CacheService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(config.redisUrl);

        this.redis.on('error', (err) => {
            console.error('Redis error:', err);
        });

        this.redis.on('connect', () => {
            console.log('Redis connected');
        });
    }

    async get(key: string): Promise<string | null> {
        return await this.redis.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.redis.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.redis.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async quit(): Promise<void> {
        await this.redis.quit();
    }
}

export default new CacheService();



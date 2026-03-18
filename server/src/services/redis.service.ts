import { createClient, RedisClientType } from 'redis';
import { logger } from '../config/logger';

let redisClient: RedisClientType | null = null;

export async function initializeRedis(): Promise<void> {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD || undefined,
            socket: {
                reconnectStrategy: false, // Disable reconnection in development
            },
        });

        redisClient.on('error', (err) => {
            logger.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected');
        });

        await redisClient.connect();
    } catch (error) {
        logger.warn('Failed to initialize Redis, continuing without cache:', error);
        if (redisClient) {
            try {
                await redisClient.disconnect();
            } catch (e) { /* ignore disconnect error */ }
        }
        redisClient = null;
    }
}

export class RedisService {
    static get client() {
        return redisClient;
    }

    static async get<T>(key: string): Promise<T | null> {
        if (!this.client) return null;
        try {
            const value = await this.client.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }

    static async set(key: string, value: any, expirationSeconds?: number): Promise<void> {
        if (!this.client) return;
        try {
            const stringValue = JSON.stringify(value);
            if (expirationSeconds) {
                await this.client.setEx(key, expirationSeconds, stringValue);
            } else {
                await this.client.set(key, stringValue);
            }
        } catch (error) {
            logger.error(`Redis SET error for key ${key}:`, error);
        }
    }

    static async del(key: string): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error(`Redis DEL error for key ${key}:`, error);
        }
    }

    static async exists(key: string): Promise<boolean> {
        if (!this.client) return false;
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    static async flushPattern(pattern: string): Promise<void> {
        if (!this.client) return;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        } catch (error) {
            logger.error(`Redis FLUSH PATTERN error for pattern ${pattern}:`, error);
        }
    }
}

export { redisClient };

import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

/**
 * Global Redis Cache Module
 * Provides caching capabilities across the application
 */
@Global()
@Module({
    imports: [
        NestCacheModule.registerAsync({
            useFactory: async () => {
                const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';

                try {
                    const store = await redisStore({
                        url: redisUrl,
                        ttl: 60 * 60 * 1000, // 1 hour default TTL in ms
                    });

                    console.log('[Cache] Redis connected:', redisUrl);

                    return {
                        store,
                        ttl: 60 * 60 * 1000, // 1 hour
                    };
                } catch (error) {
                    console.warn('[Cache] Redis connection failed, using in-memory cache:', error.message);
                    // Fallback to in-memory cache
                    return {
                        ttl: 60 * 60 * 1000,
                    };
                }
            },
        }),
    ],
    exports: [NestCacheModule],
})
export class RedisCacheModule { }

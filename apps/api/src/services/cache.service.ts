import { redis, redisPub } from '../redis/index.js';
import { REDIS_KEYS, TIMING, type BatchListResponse } from '@healthchecker/shared';

export class CacheService {
  static getBatchesList = async (): Promise<BatchListResponse | null> => {
    try {
      const cached = await redis.get(REDIS_KEYS.BATCH_LIST_CACHE);
      if (cached) {
        return JSON.parse(cached) as BatchListResponse;
      }
    } catch (err) {
      console.error('[CacheService] Error reading cache:', err);
    }
    return null;
  };

  static setBatchesList = async (
    data: BatchListResponse,
    ttlSeconds: number = TIMING.BATCH_LIST_CACHE_TTL_SECONDS
  ): Promise<void> => {
    try {
      await redis.set(
        REDIS_KEYS.BATCH_LIST_CACHE,
        JSON.stringify({ ...data, cachedAt: new Date().toISOString() }),
        'EX',
        ttlSeconds
      );
    } catch (err) {
      console.error('[CacheService] Error setting cache:', err);
    }
  };

  static invalidateBatchesList = async (): Promise<void> => {
    try {
      await redis.del(REDIS_KEYS.BATCH_LIST_CACHE);
      await redisPub.publish(
        REDIS_KEYS.CACHE_INVALIDATED_CHANNEL,
        JSON.stringify({ key: REDIS_KEYS.BATCH_LIST_CACHE, timestamp: Date.now() })
      );
    } catch (err) {
      console.error('[CacheService] Error invalidating cache:', err);
    }
  };
}

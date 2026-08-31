import { Redis } from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  }
});

export const redisSub = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const redisPub = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redis.on('error', (err) => console.error('[Redis Client] Error:', err.message));
redisSub.on('error', (err) => console.error('[Redis Sub] Error:', err.message));
redisPub.on('error', (err) => console.error('[Redis Pub] Error:', err.message));

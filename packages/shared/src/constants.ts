export const QUEUE_NAME = 'url-checks';

export const REDIS_KEYS = {
  BATCH_LIST_CACHE: 'cache:batches:list',
  CACHE_INVALIDATED_CHANNEL: 'cache:invalidated',
  batchEventsChannel: (batchId: string) => `batch:${batchId}:events`,
  batchCancelledFlag: (batchId: string) => `batch:${batchId}:cancelled`
} as const;

export const LIMITS = {
  MAX_URLS_PER_BATCH: 1000,
  MIN_URLS_PER_BATCH: 1,
  MAX_NAME_LENGTH: 255,
  MAX_PAGE_TITLE_LENGTH: 500,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  DEFAULT_BATCH_LIST_LIMIT: 50
} as const;

export const TIMING = {
  HTTP_PROBE_TIMEOUT_MS: 10000,
  SSE_HEARTBEAT_INTERVAL_MS: 15000,
  BATCH_LIST_CACHE_TTL_SECONDS: 30,
  BATCH_CANCELLED_REDIS_TTL_SECONDS: 3600,
  STREAM_RECONNECT_DELAY_MS: 3000,
  POLL_REFRESH_INTERVAL_MS: 5000,
  NOTIFICATION_AUTO_HIDE_MS: 2000
} as const;

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_BACKOFF_DELAY_MS: 1000
} as const;

export const WORKER_DEFAULTS = {
  CONCURRENCY: 5,
  RATE_LIMIT_MAX: 10,
  RATE_LIMIT_DURATION_MS: 1000
} as const;

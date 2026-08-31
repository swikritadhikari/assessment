import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from './config.js';
import { WorkerDb } from './db.js';
import { executeHttpCheck } from './checker.js';
import {
  UrlCheckStatus,
  QUEUE_NAME,
  RETRY_CONFIG,
  REDIS_KEYS,
  type CheckJobData,
  type SSEMessage,
  type CheckProgressPayload
} from '@healthchecker/shared';

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const redisPub = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const broadcastEvent = async <T>(batchId: string, event: SSEMessage<T>): Promise<void> => {
  try {
    await redisPub.publish(REDIS_KEYS.batchEventsChannel(batchId), JSON.stringify(event));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown publish error';
    console.error('[Worker] Failed to publish SSE event:', msg);
  }
};

const invalidateListCache = async (): Promise<void> => {
  try {
    await redis.del(REDIS_KEYS.BATCH_LIST_CACHE);
  } catch {
    // ignore
  }
};

console.log(
  `[Worker] Starting BullMQ worker process... (Concurrency: ${config.concurrency}, Rate Limit: ${config.rateLimitMax} req/${config.rateLimitDuration}ms)`
);

export const worker = new Worker<CheckJobData>(
  QUEUE_NAME,
  async (job: Job<CheckJobData>) => {
    const { checkId, batchId, url } = job.data;
    const currentAttempt = job.attemptsMade + 1;

    const isCancelled = await redis.get(REDIS_KEYS.batchCancelledFlag(batchId));
    if (isCancelled) {
      console.log(`[Worker] Batch ${batchId} is cancelled. Skipping check ${checkId}.`);
      return;
    }

    const marked = await WorkerDb.markInProgress(checkId);
    if (!marked) {
      return;
    }

    console.log(
      `[Worker] Processing job ${job.id} -> Check ${checkId} | URL: ${url} (Attempt ${currentAttempt})`
    );

    const result = await executeHttpCheck(url);

    if (result.isTransient && job.attemptsMade < RETRY_CONFIG.MAX_ATTEMPTS) {
      console.warn(
        `[Worker] Transient error for ${url}: ${result.errorMessage}. Retrying (Attempt ${currentAttempt}/${RETRY_CONFIG.MAX_ATTEMPTS + 1})...`
      );
      throw new Error(`Transient failure: ${result.errorMessage}`);
    }

    const finalStatus = result.status === 'SUCCESS' ? UrlCheckStatus.SUCCESS : UrlCheckStatus.FAILED;

    const recorded = await WorkerDb.recordCheckResult(checkId, batchId, {
      status: finalStatus,
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      pageTitle: result.pageTitle,
      errorMessage: result.errorMessage,
      attempts: currentAttempt
    });

    if (!recorded) {
      return;
    }

    await invalidateListCache();

    const payload: CheckProgressPayload = {
      checkId,
      batchId,
      url,
      status: finalStatus,
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      pageTitle: result.pageTitle,
      errorMessage: result.errorMessage,
      attempts: currentAttempt,
      completedAt: new Date().toISOString(),
      batchSummary: recorded.batchSummary
    };

    const sseMessage: SSEMessage<CheckProgressPayload> = {
      type: finalStatus === UrlCheckStatus.SUCCESS ? 'check_completed' : 'check_failed',
      batchId,
      timestamp: new Date().toISOString(),
      data: payload
    };

    await broadcastEvent(batchId, sseMessage);
  },
  {
    connection: redis,
    concurrency: config.concurrency,
    limiter: {
      max: config.rateLimitMax,
      duration: config.rateLimitDuration
    }
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker internal error:', err);
});

const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.on(signal, async () => {
    console.log(`[Worker] Received ${signal}. Closing worker...`);
    await worker.close();
    await redis.quit();
    await redisPub.quit();
    process.exit(0);
  });
}

import { Queue } from 'bullmq';
import { redis } from '../redis/index.js';
import type { CheckJobData } from '@healthchecker/shared';

export const QUEUE_NAME = 'url-checks';

export const urlCheckQueue = new Queue<CheckJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 4, // 1 initial attempt + 3 retries on transient failure
    backoff: {
      type: 'exponential',
      delay: 1000 // 1s, 2s, 4s backoff
    },
    removeOnComplete: 1000,
    removeOnFail: 1000
  }
});

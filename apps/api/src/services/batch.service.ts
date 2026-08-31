import { pool } from '../db/index.js';
import { urlCheckQueue } from '../queue/index.js';
import { redis, redisPub } from '../redis/index.js';
import { CacheService } from './cache.service.js';
import {
  BatchStatus,
  UrlCheckStatus,
  REDIS_KEYS,
  TIMING,
  LIMITS,
  type Batch,
  type BatchDetail,
  type BatchListResponse,
  type CreateBatchRequest,
  type CreateBatchResponse,
  type UrlCheck,
  type SSEMessage,
  type BatchDbRow,
  type UrlCheckDbRow,
  type BatchCancelledPayload,
  type BatchRetriedPayload
} from '@healthchecker/shared';

const mapBatchRow = (row: BatchDbRow): Batch => ({
  id: row.id,
  name: row.name,
  status: row.status as BatchStatus,
  totalUrls: typeof row.total_urls === 'number' ? row.total_urls : parseInt(row.total_urls, 10),
  completedUrls: typeof row.completed_urls === 'number' ? row.completed_urls : parseInt(row.completed_urls, 10),
  successfulUrls: typeof row.successful_urls === 'number' ? row.successful_urls : parseInt(row.successful_urls, 10),
  failedUrls: typeof row.failed_urls === 'number' ? row.failed_urls : parseInt(row.failed_urls, 10),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString()
});

const mapUrlCheckRow = (row: UrlCheckDbRow): UrlCheck => ({
  id: row.id,
  batchId: row.batch_id,
  url: row.url,
  status: row.status as UrlCheckStatus,
  httpStatus: row.http_status !== null ? (typeof row.http_status === 'number' ? row.http_status : parseInt(row.http_status, 10)) : null,
  responseTimeMs: row.response_time_ms !== null ? (typeof row.response_time_ms === 'number' ? row.response_time_ms : parseInt(row.response_time_ms, 10)) : null,
  pageTitle: row.page_title,
  errorMessage: row.error_message,
  attempts: typeof row.attempts === 'number' ? row.attempts : parseInt(row.attempts, 10),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
  completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
});

export class BatchService {
  static createBatch = async (req: CreateBatchRequest): Promise<CreateBatchResponse> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batchName = req.name?.trim() || `Batch ${new Date().toLocaleTimeString()} (${req.urls.length} URLs)`;
      const totalUrls = req.urls.length;

      const batchRes = await client.query<BatchDbRow>(
        `INSERT INTO batches (name, status, total_urls, completed_urls, successful_urls, failed_urls)
         VALUES ($1, $2, $3, 0, 0, 0)
         RETURNING *`,
        [batchName, BatchStatus.PROCESSING, totalUrls]
      );
      const batchRow = batchRes.rows[0];
      const batchId = batchRow.id;

      const values: (string | UrlCheckStatus)[] = [];
      const placeholders: string[] = [];
      let paramIdx = 1;

      for (const targetUrl of req.urls) {
        placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
        values.push(batchId, targetUrl, UrlCheckStatus.QUEUED);
        paramIdx += 3;
      }

      const checksRes = await client.query<{ id: string; url: string }>(
        `INSERT INTO url_checks (batch_id, url, status)
         VALUES ${placeholders.join(', ')}
         RETURNING id, url`,
        values
      );

      await client.query('COMMIT');

      const jobs = checksRes.rows.map((row) => ({
        name: `check-${row.id}`,
        data: {
          checkId: row.id,
          batchId,
          url: row.url
        },
        opts: {
          jobId: `check-${row.id}`
        }
      }));

      await urlCheckQueue.addBulk(jobs);
      await CacheService.invalidateBatchesList();

      return {
        batchId,
        name: batchRow.name,
        status: batchRow.status as BatchStatus,
        totalUrls: typeof batchRow.total_urls === 'number' ? batchRow.total_urls : parseInt(batchRow.total_urls, 10),
        createdAt: new Date(batchRow.created_at).toISOString()
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  static getBatchById = async (id: string): Promise<BatchDetail | null> => {
    const batchRes = await pool.query<BatchDbRow>('SELECT * FROM batches WHERE id = $1', [id]);
    if (batchRes.rows.length === 0) return null;

    const checksRes = await pool.query<UrlCheckDbRow>(
      'SELECT * FROM url_checks WHERE batch_id = $1 ORDER BY created_at ASC, id ASC',
      [id]
    );

    const batch = mapBatchRow(batchRes.rows[0]);
    const checks = checksRes.rows.map(mapUrlCheckRow);

    return {
      ...batch,
      checks
    };
  };

  static listBatches = async (): Promise<BatchListResponse> => {
    const cached = await CacheService.getBatchesList();
    if (cached) {
      return cached;
    }

    const res = await pool.query<BatchDbRow>(
      'SELECT * FROM batches ORDER BY created_at DESC LIMIT $1',
      [LIMITS.DEFAULT_BATCH_LIST_LIMIT]
    );
    const countRes = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM batches');

    const batches = res.rows.map(mapBatchRow);
    const total = parseInt(countRes.rows[0].count, 10);

    const response: BatchListResponse = { batches, total };
    await CacheService.setBatchesList(response, TIMING.BATCH_LIST_CACHE_TTL_SECONDS);

    return response;
  };

  static cancelBatch = async (id: string): Promise<BatchDetail | null> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batchRes = await client.query<BatchDbRow>('SELECT * FROM batches WHERE id = $1 FOR UPDATE', [id]);
      if (batchRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await redis.set(
        REDIS_KEYS.batchCancelledFlag(id),
        '1',
        'EX',
        TIMING.BATCH_CANCELLED_REDIS_TTL_SECONDS
      );

      await client.query(
        `UPDATE batches
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [BatchStatus.CANCELLED, id]
      );

      await client.query(
        `UPDATE url_checks
         SET status = $1, error_message = 'Cancelled by user', updated_at = NOW(), completed_at = NOW()
         WHERE batch_id = $2 AND status IN ($3, $4)`,
        [UrlCheckStatus.CANCELLED, id, UrlCheckStatus.QUEUED, UrlCheckStatus.IN_PROGRESS]
      );

      await client.query('COMMIT');

      const sseMsg: SSEMessage<BatchCancelledPayload> = {
        type: 'batch_cancelled',
        batchId: id,
        timestamp: new Date().toISOString(),
        data: { status: BatchStatus.CANCELLED }
      };
      await redisPub.publish(REDIS_KEYS.batchEventsChannel(id), JSON.stringify(sseMsg));
      await CacheService.invalidateBatchesList();

      return await this.getBatchById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  static retryFailed = async (id: string): Promise<BatchDetail | null> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batchRes = await client.query<BatchDbRow>('SELECT * FROM batches WHERE id = $1 FOR UPDATE', [id]);
      if (batchRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      await redis.del(REDIS_KEYS.batchCancelledFlag(id));

      const failedChecksRes = await client.query<{ id: string; url: string }>(
        `SELECT id, url FROM url_checks
         WHERE batch_id = $1 AND status IN ($2, $3)`,
        [id, UrlCheckStatus.FAILED, UrlCheckStatus.CANCELLED]
      );

      const failedChecks = failedChecksRes.rows;

      if (failedChecks.length === 0) {
        await client.query('COMMIT');
        return await this.getBatchById(id);
      }

      const failedIds = failedChecks.map((c) => c.id);
      await client.query(
        `UPDATE url_checks
         SET status = $1, http_status = NULL, response_time_ms = NULL, page_title = NULL,
             error_message = NULL, attempts = 0, completed_at = NULL, updated_at = NOW()
         WHERE id = ANY($2::uuid[])`,
        [UrlCheckStatus.QUEUED, failedIds]
      );

      const countsRes = await client.query<{
        total: string;
        successful: string;
        failed: string;
        completed: string;
      }>(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
           COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
           COUNT(*) FILTER (WHERE status IN ('SUCCESS', 'FAILED', 'CANCELLED')) as completed
         FROM url_checks
         WHERE batch_id = $1`,
        [id]
      );
      const counts = countsRes.rows[0];

      await client.query(
        `UPDATE batches
         SET status = $1, completed_urls = $2, successful_urls = $3, failed_urls = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          BatchStatus.PROCESSING,
          parseInt(counts.completed, 10),
          parseInt(counts.successful, 10),
          parseInt(counts.failed, 10),
          id
        ]
      );

      await client.query('COMMIT');

      const jobs = failedChecks.map((row) => ({
        name: `check-${row.id}`,
        data: {
          checkId: row.id,
          batchId: id,
          url: row.url
        },
        opts: {
          jobId: `check-${row.id}-${Date.now()}`
        }
      }));

      await urlCheckQueue.addBulk(jobs);

      const sseMsg: SSEMessage<BatchRetriedPayload> = {
        type: 'batch_retried',
        batchId: id,
        timestamp: new Date().toISOString(),
        data: { retriedCount: failedChecks.length }
      };
      await redisPub.publish(REDIS_KEYS.batchEventsChannel(id), JSON.stringify(sseMsg));
      await CacheService.invalidateBatchesList();

      return await this.getBatchById(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };
}

import pg from 'pg';
import { config } from './config.js';
import { BatchStatus, UrlCheckStatus } from '@healthchecker/shared';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export interface CheckUpdateResult {
  status: UrlCheckStatus;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  pageTitle?: string | null;
  errorMessage?: string | null;
  attempts: number;
}

export class WorkerDb {
  static async markInProgress(checkId: string): Promise<boolean> {
    const res = await pool.query(
      `UPDATE url_checks
       SET status = $1, attempts = attempts + 1, updated_at = NOW()
       WHERE id = $2 AND status != $3
       RETURNING id`,
      [UrlCheckStatus.IN_PROGRESS, checkId, UrlCheckStatus.CANCELLED]
    );
    return res.rowCount !== null && res.rowCount > 0;
  }

  static async recordCheckResult(
    checkId: string,
    batchId: string,
    result: CheckUpdateResult
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        `UPDATE url_checks
         SET status = $1,
             http_status = $2,
             response_time_ms = $3,
             page_title = $4,
             error_message = $5,
             attempts = $6,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $7 AND status != $8
         RETURNING *`,
        [
          result.status,
          result.httpStatus ?? null,
          result.responseTimeMs ?? null,
          result.pageTitle ?? null,
          result.errorMessage ?? null,
          result.attempts,
          checkId,
          UrlCheckStatus.CANCELLED
        ]
      );

      if (checkRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const countsRes = await client.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful,
           COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
           COUNT(*) FILTER (WHERE status IN ('SUCCESS', 'FAILED', 'CANCELLED')) as completed
         FROM url_checks
         WHERE batch_id = $1`,
        [batchId]
      );

      const counts = countsRes.rows[0];
      const totalUrls = parseInt(counts.total, 10);
      const successfulUrls = parseInt(counts.successful, 10);
      const failedUrls = parseInt(counts.failed, 10);
      const completedUrls = parseInt(counts.completed, 10);

      let newBatchStatus = BatchStatus.PROCESSING;
      if (completedUrls >= totalUrls) {
        newBatchStatus = failedUrls > 0 ? BatchStatus.PARTIALLY_FAILED : BatchStatus.COMPLETED;
      }

      const updateBatchRes = await client.query(
        `UPDATE batches
         SET completed_urls = $1,
             successful_urls = $2,
             failed_urls = $3,
             status = CASE WHEN status = 'CANCELLED' THEN 'CANCELLED' ELSE $4 END,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [completedUrls, successfulUrls, failedUrls, newBatchStatus, batchId]
      );

      await client.query('COMMIT');

      const batch = updateBatchRes.rows[0];
      return {
        check: checkRes.rows[0],
        batchSummary: {
          totalUrls: parseInt(batch.total_urls, 10),
          completedUrls: parseInt(batch.completed_urls, 10),
          successfulUrls: parseInt(batch.successful_urls, 10),
          failedUrls: parseInt(batch.failed_urls, 10),
          status: batch.status as BatchStatus
        }
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

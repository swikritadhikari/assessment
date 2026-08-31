import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export const initDb = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        total_urls INTEGER NOT NULL DEFAULT 0,
        completed_urls INTEGER NOT NULL DEFAULT 0,
        successful_urls INTEGER NOT NULL DEFAULT 0,
        failed_urls INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS url_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
        http_status INTEGER,
        response_time_ms INTEGER,
        page_title TEXT,
        error_message TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_batches_created_at ON batches(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_url_checks_batch_id ON url_checks(batch_id);
      CREATE INDEX IF NOT EXISTS idx_url_checks_status ON url_checks(status);
    `);
    console.log('[Database] PostgreSQL schema initialized successfully.');
  } finally {
    client.release();
  }
};

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5433/healthchecker',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6380',
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  rateLimitMax: parseInt(process.env.WORKER_RATE_LIMIT_MAX || '10', 10),
  rateLimitDuration: parseInt(process.env.WORKER_RATE_LIMIT_DURATION || '1000', 10)
};

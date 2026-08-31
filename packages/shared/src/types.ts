export enum BatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED'
}

export enum UrlCheckStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  totalUrls: number;
  completedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  createdAt: string;
  updatedAt: string;
}

export interface UrlCheck {
  id: string;
  batchId: string;
  url: string;
  status: UrlCheckStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  pageTitle: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface BatchDetail extends Batch {
  checks: UrlCheck[];
}

export interface CreateBatchRequest {
  name?: string;
  urls: string[];
}

export interface CreateBatchResponse {
  batchId: string;
  name: string;
  status: BatchStatus;
  totalUrls: number;
  createdAt: string;
}

export interface BatchListResponse {
  batches: Batch[];
  total: number;
  cachedAt?: string;
}

export type SSEEventType =
  | 'batch_started'
  | 'check_started'
  | 'check_completed'
  | 'check_failed'
  | 'batch_progress'
  | 'batch_completed'
  | 'batch_cancelled'
  | 'batch_retried'
  | 'connected'
  | 'ping';

export interface SSEMessage<T> {
  type: SSEEventType;
  batchId: string;
  timestamp: string;
  data: T;
}

export interface BatchSummaryData {
  totalUrls: number;
  completedUrls: number;
  successfulUrls: number;
  failedUrls: number;
  status: BatchStatus;
}

export interface CheckProgressPayload {
  checkId: string;
  batchId: string;
  url: string;
  status: UrlCheckStatus;
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  pageTitle?: string | null;
  errorMessage?: string | null;
  attempts: number;
  completedAt?: string | null;
  batchSummary: BatchSummaryData;
}

export interface BatchCancelledPayload {
  status: BatchStatus.CANCELLED;
}

export interface BatchRetriedPayload {
  retriedCount: number;
}

export interface ConnectedPayload {
  batchId: string;
  connectedAt: string;
}

export interface CheckJobData {
  checkId: string;
  batchId: string;
  url: string;
}

export interface BatchDbRow {
  id: string;
  name: string;
  status: string;
  total_urls: string | number;
  completed_urls: string | number;
  successful_urls: string | number;
  failed_urls: string | number;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface UrlCheckDbRow {
  id: string;
  batch_id: string;
  url: string;
  status: string;
  http_status: string | number | null;
  response_time_ms: string | number | null;
  page_title: string | null;
  error_message: string | null;
  attempts: string | number;
  created_at: string | Date;
  updated_at: string | Date;
  completed_at: string | Date | null;
}

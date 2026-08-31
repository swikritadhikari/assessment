'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TIMING,
  BatchStatus,
  type BatchDetail,
  type SSEMessage,
  type CheckProgressPayload
} from '@healthchecker/shared';
import { fetchBatchDetail } from '../lib/api';

export type StreamStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const getApiBase = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

export const useBatchStream = (initialBatch: BatchDetail) => {
  const [batch, setBatch] = useState<BatchDetail>(initialBatch);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setBatch(initialBatch);
  }, [initialBatch]);

  const refreshFullBatch = useCallback(async () => {
    try {
      const fresh = await fetchBatchDetail(batch.id);
      if (fresh) {
        setBatch(fresh);
      }
    } catch (err) {
      console.error('[Stream] Failed to reconcile state:', err);
    }
  }, [batch.id]);

  useEffect(() => {
    const isRunning =
      batch.status === BatchStatus.PROCESSING || batch.status === BatchStatus.PENDING;
    if (!isRunning) return;

    const pollInterval = setInterval(() => {
      refreshFullBatch();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [batch.status, refreshFullBatch]);

  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStreamStatus('connecting');
      const apiBase = getApiBase();
      const eventSource = new EventSource(`${apiBase}/api/batches/${batch.id}/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setStreamStatus('connected');
        refreshFullBatch();
      };

      eventSource.addEventListener('connected', () => {
        setStreamStatus('connected');
      });

      const handleCheckUpdate = (event: MessageEvent) => {
        try {
          const sseMsg: SSEMessage<CheckProgressPayload> = JSON.parse(event.data);
          const payload = sseMsg.data;
          if (!payload) return;

          setBatch((prev) => {
            const updatedChecks = prev.checks.map((chk) => {
              if (chk.id === payload.checkId) {
                return {
                  ...chk,
                  status: payload.status,
                  httpStatus: payload.httpStatus ?? chk.httpStatus,
                  responseTimeMs: payload.responseTimeMs ?? chk.responseTimeMs,
                  pageTitle: payload.pageTitle ?? chk.pageTitle,
                  errorMessage: payload.errorMessage ?? chk.errorMessage,
                  attempts: payload.attempts,
                  completedAt: payload.completedAt ?? new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
              }
              return chk;
            });

            return {
              ...prev,
              totalUrls: payload.batchSummary.totalUrls,
              completedUrls: payload.batchSummary.completedUrls,
              successfulUrls: payload.batchSummary.successfulUrls,
              failedUrls: payload.batchSummary.failedUrls,
              status: payload.batchSummary.status,
              checks: updatedChecks
            };
          });
        } catch (err) {
          console.error('[Stream] Error parsing check update event:', err);
        }
      };

      eventSource.onmessage = handleCheckUpdate;
      eventSource.addEventListener('check_completed', handleCheckUpdate);
      eventSource.addEventListener('check_failed', handleCheckUpdate);
      eventSource.addEventListener('batch_progress', handleCheckUpdate);

      eventSource.addEventListener('batch_cancelled', () => {
        refreshFullBatch();
      });

      eventSource.addEventListener('batch_retried', () => {
        refreshFullBatch();
      });

      eventSource.addEventListener('batch_completed', () => {
        refreshFullBatch();
      });

      eventSource.onerror = () => {
        setStreamStatus('reconnecting');
        eventSource.close();

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, TIMING.STREAM_RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setStreamStatus('disconnected');
    };
  }, [batch.id, refreshFullBatch]);

  return {
    batch,
    setBatch,
    streamStatus,
    refreshFullBatch
  };
};

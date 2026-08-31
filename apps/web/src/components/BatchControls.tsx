'use client';

import { useState } from 'react';
import { BatchStatus, TIMING, type BatchDetail } from '@healthchecker/shared';
import { cancelBatchApi, retryBatchApi } from '../lib/api';
import type { StreamStatus } from '../hooks/useBatchStream';
import { Ban, RotateCcw, Copy, Check, Radio } from 'lucide-react';

interface BatchControlsProps {
  batch: BatchDetail;
  streamStatus: StreamStatus;
  onUpdate: (updated: BatchDetail) => void;
}

export const BatchControls = ({ batch, streamStatus, onUpdate }: BatchControlsProps) => {
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

  const isProcessing = batch.status === BatchStatus.PROCESSING || batch.status === BatchStatus.PENDING;
  const canCancel = isProcessing;
  const canRetry = !isProcessing && (batch.failedUrls > 0 || batch.status === BatchStatus.CANCELLED);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this running batch?')) return;
    setCancelling(true);
    try {
      const updated = await cancelBatchApi(batch.id);
      onUpdate(updated);
    } catch {
      alert('Failed to cancel batch');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const updated = await retryBatchApi(batch.id);
      onUpdate(updated);
    } catch {
      alert('Failed to retry failed URLs');
    } finally {
      setRetrying(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), TIMING.NOTIFICATION_AUTO_HIDE_MS);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      marginBottom: '1.25rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '20px',
          background: streamStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${streamStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: streamStatus === 'connected' ? '#34d399' : '#fbbf24'
        }}>
          <Radio size={13} className={streamStatus === 'connected' ? 'animate-pulse-slow' : ''} />
          {streamStatus === 'connected' ? 'Live Stream Connected' : streamStatus === 'reconnecting' ? 'Reconnecting Stream...' : 'Connecting...'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={handleCopyLink}
          className="btn-secondary"
          title="Share or cold open this batch"
        >
          {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
          {copied ? 'Link Copied!' : 'Copy Batch URL'}
        </button>

        {canRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <RotateCcw size={14} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Enqueuing Failed Checks...' : `Retry Failed (${batch.failedUrls})`}
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-danger"
          >
            <Ban size={14} />
            {cancelling ? 'Cancelling...' : 'Cancel Batch'}
          </button>
        )}
      </div>
    </div>
  );
};

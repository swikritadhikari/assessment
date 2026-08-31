'use client';

import { BatchStatus, UrlCheckStatus } from '@healthchecker/shared';
import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: BatchStatus | UrlCheckStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  const iconSize = size === 'sm' ? 12 : 14;

  switch (status) {
    case BatchStatus.COMPLETED:
    case UrlCheckStatus.SUCCESS:
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={iconSize} />
          {status === BatchStatus.COMPLETED ? 'Completed' : 'Success'}
        </span>
      );

    case BatchStatus.PARTIALLY_FAILED:
      return (
        <span className="badge badge-warning">
          <AlertTriangle size={iconSize} />
          Partial Failures
        </span>
      );

    case BatchStatus.PROCESSING:
    case UrlCheckStatus.IN_PROGRESS:
      return (
        <span className="badge badge-info">
          <RefreshCw size={iconSize} className="animate-spin" />
          {status === BatchStatus.PROCESSING ? 'Processing' : 'In Progress'}
        </span>
      );

    case BatchStatus.PENDING:
    case UrlCheckStatus.QUEUED:
      return (
        <span className="badge badge-neutral">
          <Clock size={iconSize} />
          Queued
        </span>
      );

    case BatchStatus.CANCELLED:
    case UrlCheckStatus.CANCELLED:
      return (
        <span className="badge badge-neutral" style={{ color: '#94a3b8' }}>
          <Ban size={iconSize} />
          Cancelled
        </span>
      );

    case UrlCheckStatus.FAILED:
    default:
      return (
        <span className="badge badge-danger">
          <XCircle size={iconSize} />
          Failed
        </span>
      );
  }
};

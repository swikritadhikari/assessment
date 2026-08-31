'use client';

import type { Batch } from '@healthchecker/shared';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

interface BatchProgressProps {
  batch: Batch;
}

export const BatchProgress = ({ batch }: BatchProgressProps) => {
  const percentComplete = batch.totalUrls > 0 ? Math.round((batch.completedUrls / batch.totalUrls) * 100) : 0;
  const successPercent = batch.completedUrls > 0 ? Math.round((batch.successfulUrls / batch.completedUrls) * 100) : 0;
  const inFlight = Math.max(0, batch.totalUrls - batch.completedUrls);

  return (
    <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              {batch.name}
            </h1>
            <StatusBadge status={batch.status} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Batch ID: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{batch.id}</span> • Started at {new Date(batch.createdAt).toLocaleTimeString()}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: percentComplete === 100 ? '#34d399' : '#818cf8' }}>
            {percentComplete}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {batch.completedUrls} of {batch.totalUrls} Processed
          </div>
        </div>
      </div>

      <div style={{
        height: '10px',
        background: '#0b1120',
        borderRadius: '9999px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '1.5rem',
        border: '1px solid var(--border-subtle)'
      }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${(batch.successfulUrls / (batch.totalUrls || 1)) * 100}%`,
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${(batch.successfulUrls / (batch.totalUrls || 1)) * 100}%`,
            top: 0,
            bottom: 0,
            width: `${(batch.failedUrls / (batch.totalUrls || 1)) * 100}%`,
            background: 'linear-gradient(90deg, #ef4444, #f87171)',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '0.85rem 1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <Activity size={14} color="#818cf8" /> Total Checks
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
            {batch.totalUrls}
          </div>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '0.85rem 1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <CheckCircle2 size={14} /> Successful
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>
            {batch.successfulUrls} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>({successPercent}%)</span>
          </div>
        </div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '0.85rem 1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <XCircle size={14} /> Failed / Errors
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171' }}>
            {batch.failedUrls}
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '0.85rem 1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <Clock size={14} color="#f59e0b" /> In Flight / Remaining
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
            {inFlight}
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchBatches } from '../lib/api';
import type { Batch } from '@healthchecker/shared';
import { StatusBadge } from './StatusBadge';
import { Layers, ArrowRight, RefreshCw, Clock, CheckCircle2, XCircle } from 'lucide-react';

export const RecentBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    try {
      const res = await fetchBatches();
      setBatches(res.batches);
      if (res.cachedAt) setCachedAt(res.cachedAt);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
    const interval = setInterval(loadBatches, 2000);

    const onFocus = () => loadBatches();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadBatches]);

  return (
    <div className="glass-card" style={{ padding: '1.75rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={20} color="#818cf8" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
            Recent Batches
          </h2>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-muted)'
          }}>
            30s Redis Cache {cachedAt ? `(Synced ${new Date(cachedAt).toLocaleTimeString()})` : ''}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadBatches();
          }}
          className="btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {batches.length === 0 && !loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          No batches submitted yet. Create your first batch above!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {batches.map((batch) => {
            const percent = batch.totalUrls > 0 ? Math.round((batch.completedUrls / batch.totalUrls) * 100) : 0;

            return (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', wordBreak: 'break-word' }}>
                        {batch.name}
                      </h3>
                      <StatusBadge status={batch.status} size="sm" />
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Created {new Date(batch.createdAt).toLocaleTimeString()} • {batch.totalUrls} URLs
                    </div>

                    <div style={{
                      height: '6px',
                      background: '#0b1120',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      position: 'relative',
                      marginBottom: '0.75rem'
                    }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${(batch.successfulUrls / (batch.totalUrls || 1)) * 100}%`,
                          background: '#10b981'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          left: `${(batch.successfulUrls / (batch.totalUrls || 1)) * 100}%`,
                          top: 0,
                          bottom: 0,
                          width: `${(batch.failedUrls / (batch.totalUrls || 1)) * 100}%`,
                          background: '#ef4444'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#34d399' }}>
                        <CheckCircle2 size={12} /> {batch.successfulUrls}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f87171' }}>
                        <XCircle size={12} /> {batch.failedUrls}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                        <Clock size={12} /> {percent}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#818cf8', fontWeight: 600 }}>
                      View <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

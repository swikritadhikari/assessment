'use client';

import { useState, useMemo } from 'react';
import { UrlCheckStatus, type UrlCheck } from '@healthchecker/shared';
import { StatusBadge } from './StatusBadge';
import { Search, ExternalLink, Globe, AlertCircle } from 'lucide-react';

interface UrlCheckTableProps {
  checks: UrlCheck[];
}

export const UrlCheckTable = ({ checks }: UrlCheckTableProps) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');

  const filteredChecks = useMemo(() => {
    return checks.filter((c) => {
      if (filter === 'success' && c.status !== UrlCheckStatus.SUCCESS) return false;
      if (filter === 'failed' && c.status !== UrlCheckStatus.FAILED) return false;
      if (filter === 'pending' && c.status !== UrlCheckStatus.QUEUED && c.status !== UrlCheckStatus.IN_PROGRESS) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const urlMatch = c.url.toLowerCase().includes(q);
        const titleMatch = c.pageTitle ? c.pageTitle.toLowerCase().includes(q) : false;
        const errMatch = c.errorMessage ? c.errorMessage.toLowerCase().includes(q) : false;
        return urlMatch || titleMatch || errMatch;
      }

      return true;
    });
  }, [checks, search, filter]);

  const counts = useMemo(() => {
    let success = 0;
    let failed = 0;
    let pending = 0;
    for (const c of checks) {
      if (c.status === UrlCheckStatus.SUCCESS) success++;
      else if (c.status === UrlCheckStatus.FAILED) failed++;
      else if (c.status === UrlCheckStatus.QUEUED || c.status === UrlCheckStatus.IN_PROGRESS) pending++;
    }
    return { all: checks.length, success, failed, pending };
  }, [checks]);

  return (
    <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by URL, page title, or error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              color: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilter('all')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'all' ? '#818cf8' : 'var(--text-secondary)',
              border: filter === 'all' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)'
            }}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter('success')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'success' ? '#34d399' : 'var(--text-secondary)',
              border: filter === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)'
            }}
          >
            Success ({counts.success})
          </button>
          <button
            type="button"
            onClick={() => setFilter('failed')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === 'failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'failed' ? '#f87171' : 'var(--text-secondary)',
              border: filter === 'failed' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)'
            }}
          >
            Failed ({counts.failed})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: filter === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'pending' ? '#fbbf24' : 'var(--text-secondary)',
              border: filter === 'pending' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)'
            }}
          >
            Pending / In Flight ({counts.pending})
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '120px' }}>Status</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>URL & Page Title</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '100px' }}>HTTP Status</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '110px' }}>Latency</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, width: '90px' }}>Attempts</th>
            </tr>
          </thead>
          <tbody>
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  No URL checks match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              filteredChecks.map((chk) => {
                const is2xx = chk.httpStatus && chk.httpStatus >= 200 && chk.httpStatus < 300;
                const is3xx = chk.httpStatus && chk.httpStatus >= 300 && chk.httpStatus < 400;
                const is4xx = chk.httpStatus && chk.httpStatus >= 400 && chk.httpStatus < 500;

                return (
                  <tr
                    key={chk.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'top' }}>
                      <StatusBadge status={chk.status} size="sm" />
                    </td>

                    <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <a
                          href={chk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono"
                          style={{
                            color: '#e2e8f0',
                            textDecoration: 'none',
                            fontWeight: 500,
                            wordBreak: 'break-all'
                          }}
                        >
                          {chk.url}
                        </a>
                        <a
                          href={chk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-muted)', display: 'inline-flex' }}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {chk.pageTitle && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Globe size={11} color="#64748b" />
                          <span style={{ fontStyle: 'italic' }}>&quot;{chk.pageTitle}&quot;</span>
                        </div>
                      )}

                      {chk.errorMessage && (
                        <div style={{ fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <AlertCircle size={12} />
                          {chk.errorMessage}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'top' }}>
                      {chk.httpStatus ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            background: is2xx
                              ? 'rgba(16, 185, 129, 0.15)'
                              : is3xx
                              ? 'rgba(6, 182, 212, 0.15)'
                              : is4xx
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: is2xx
                              ? '#34d399'
                              : is3xx
                              ? '#38bdf8'
                              : is4xx
                              ? '#fbbf24'
                              : '#f87171',
                            border: `1px solid ${
                              is2xx
                                ? 'rgba(16, 185, 129, 0.3)'
                                : is3xx
                                ? 'rgba(6, 182, 212, 0.3)'
                                : is4xx
                                ? 'rgba(245, 158, 11, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)'
                            }`
                          }}
                        >
                          {chk.httpStatus}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'top' }}>
                      {chk.responseTimeMs !== null ? (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.8rem',
                            color:
                              chk.responseTimeMs < 300
                                ? '#34d399'
                                : chk.responseTimeMs < 1000
                                ? '#fbbf24'
                                : '#f87171'
                          }}
                        >
                          {chk.responseTimeMs} ms
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '0.85rem 0.5rem', verticalAlign: 'top' }}>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: chk.attempts > 1 ? '#fbbf24' : 'var(--text-muted)' }}>
                        {chk.attempts > 0 ? `${chk.attempts} / 4` : '0 / 4'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

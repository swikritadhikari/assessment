'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseUrlsFromText } from '@healthchecker/shared';
import { createBatchFromJson, createBatchFromFormData } from '../lib/api';
import { UploadCloud, FileText, Send, Sparkles, AlertCircle } from 'lucide-react';

const SAMPLE_PRESETS = [
  'https://google.com',
  'https://github.com',
  'https://wikipedia.org',
  'https://httpbin.org/status/200',
  'https://httpbin.org/status/404',
  'https://httpbin.org/status/500',
  'https://httpbin.org/delay/1',
  'https://news.ycombinator.com',
  'https://cloudflare.com',
  'https://httpbin.org/status/503'
];

export const BatchForm = ({ onBatchCreated }: { onBatchCreated?: () => void }) => {
  const router = useRouter();
  const [tab, setTab] = useState<'paste' | 'upload'>('paste');
  const [name, setName] = useState('');
  const [urlText, setUrlText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectedUrls = tab === 'paste' ? parseUrlsFromText(urlText) : [];

  const handleLoadSamples = () => {
    setUrlText(SAMPLE_PRESETS.join('\n'));
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (tab === 'paste') {
        const urls = parseUrlsFromText(urlText);
        if (urls.length === 0) {
          setError('Please provide at least one valid HTTP/HTTPS URL.');
          setSubmitting(false);
          return;
        }

        const res = await createBatchFromJson(name.trim() || undefined, urls);
        onBatchCreated?.();
        router.push(`/batches/${res.batchId}`);
      } else {
        if (!file) {
          setError('Please select a CSV or text file to upload.');
          setSubmitting(false);
          return;
        }

        const formData = new FormData();
        if (name.trim()) formData.append('name', name.trim());
        formData.append('file', file);

        const res = await createBatchFromFormData(formData);
        onBatchCreated?.();
        router.push(`/batches/${res.batchId}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit batch.';
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
            Submit URLs for Health Check
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Checks are distributed via BullMQ with a strict 10 req/s rate limit, 5 concurrency & 3x exponential retries.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSamples}
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          <Sparkles size={14} color="#818cf8" />
          Load Demo Preset
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => { setTab('paste'); setError(null); }}
          style={{
            background: tab === 'paste' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: tab === 'paste' ? '#818cf8' : 'var(--text-secondary)',
            border: tab === 'paste' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease'
          }}
        >
          <FileText size={16} />
          Paste URLs ({detectedUrls.length})
        </button>

        <button
          type="button"
          onClick={() => { setTab('upload'); setError(null); }}
          style={{
            background: tab === 'upload' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: tab === 'upload' ? '#818cf8' : 'var(--text-secondary)',
            border: tab === 'upload' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s ease'
          }}
        >
          <UploadCloud size={16} />
          Upload CSV / File {file ? `(${file.name})` : ''}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger-border)',
          color: '#f87171',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Batch Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g., Production API Probing Batch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
        </div>

        {tab === 'paste' ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Target URLs (One URL per line or comma-separated)
              </label>
              <span style={{ fontSize: '0.75rem', color: detectedUrls.length > 0 ? '#34d399' : 'var(--text-muted)' }}>
                {detectedUrls.length} valid URL{detectedUrls.length === 1 ? '' : 's'} detected
              </span>
            </div>
            <textarea
              rows={7}
              placeholder="https://example.com&#10;https://api.github.com&#10;https://wikipedia.org"
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              className="font-mono"
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.75rem',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-active)',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(99, 102, 241, 0.03)',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <UploadCloud size={36} color="#818cf8" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>
                {file ? file.name : 'Click or Drag CSV / Text file here'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Accepts .csv or .txt containing URLs. Up to 1,000 URLs per batch.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={submitting || (tab === 'paste' && detectedUrls.length === 0) || (tab === 'upload' && !file)}
            className="btn-primary"
          >
            <Send size={16} />
            {submitting ? 'Creating Batch & Jobs...' : 'Start Health Check Batch'}
          </button>
        </div>
      </form>
    </div>
  );
};

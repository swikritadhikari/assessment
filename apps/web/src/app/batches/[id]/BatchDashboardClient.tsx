'use client';

import Link from 'next/link';
import type { BatchDetail } from '@healthchecker/shared';
import { useBatchStream } from '../../../hooks/useBatchStream';
import { BatchProgress } from '../../../components/BatchProgress';
import { BatchControls } from '../../../components/BatchControls';
import { UrlCheckTable } from '../../../components/UrlCheckTable';
import { ArrowLeft } from 'lucide-react';

interface BatchDashboardClientProps {
  initialBatch: BatchDetail;
}

export const BatchDashboardClient = ({ initialBatch }: BatchDashboardClientProps) => {
  const { batch, setBatch, streamStatus } = useBatchStream(initialBatch);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 500,
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeft size={14} />
          Back to Batches
        </Link>
      </div>

      <BatchProgress batch={batch} />

      <BatchControls
        batch={batch}
        streamStatus={streamStatus}
        onUpdate={(updated) => setBatch(updated)}
      />

      <UrlCheckTable checks={batch.checks} />
    </div>
  );
};

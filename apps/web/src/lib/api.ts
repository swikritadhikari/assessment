import type {
  BatchDetail,
  BatchListResponse,
  CreateBatchResponse
} from '@healthchecker/shared';

const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }
  return (process.env.API_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
};

export const fetchBatches = async (): Promise<BatchListResponse> => {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/batches`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch batches: ${res.statusText}`);
  }
  return res.json();
};

export const fetchBatchDetail = async (id: string): Promise<BatchDetail> => {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/batches/${id}`, {
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch batch details: ${res.statusText}`);
  }
  return res.json();
};

export const createBatchFromJson = async (name: string | undefined, urls: string[]): Promise<CreateBatchResponse> => {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, urls })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to create batch: ${res.statusText}`);
  }
  return res.json();
};

export const createBatchFromFormData = async (formData: FormData): Promise<CreateBatchResponse> => {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/batches`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Failed to create batch: ${res.statusText}`);
  }
  return res.json();
};

export const cancelBatchApi = async (batchId: string): Promise<BatchDetail> => {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/batches/${batchId}/cancel`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error(`Failed to cancel batch: ${res.statusText}`);
  }
  return res.json();
};

export const retryBatchApi = async (batchId: string): Promise<BatchDetail> => {
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/batches/${batchId}/retry`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error(`Failed to retry batch: ${res.statusText}`);
  }
  return res.json();
};

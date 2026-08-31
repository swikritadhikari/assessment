import { notFound } from 'next/navigation';
import { fetchBatchDetail } from '../../../lib/api';
import { BatchDashboardClient } from './BatchDashboardClient';

export const dynamic = 'force-dynamic';

interface BatchPageProps {
  params: Promise<{ id: string }>;
}

const BatchPage = async ({ params }: BatchPageProps) => {
  const { id } = await params;

  try {
    const batch = await fetchBatchDetail(id);
    if (!batch) {
      notFound();
    }

    return <BatchDashboardClient initialBatch={batch} />;
  } catch {
    notFound();
  }
};

export default BatchPage;

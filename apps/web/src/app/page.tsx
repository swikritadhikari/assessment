import { BatchForm } from '../components/BatchForm';
import { RecentBatches } from '../components/RecentBatches';

export const dynamic = 'force-dynamic';

const HomePage = () => {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.75rem'
        }}>
          High-Velocity Bulk URL Health Verification
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto' }}>
          Asynchronous health probing with distributed BullMQ rate-limiting, live Server-Sent Events, and instant database state reconciliation.
        </p>
      </div>

      <BatchForm />
      <RecentBatches />
    </div>
  );
};

export default HomePage;

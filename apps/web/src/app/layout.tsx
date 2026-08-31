import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'ProbePulse — Distributed Bulk URL Health Checker',
  description: 'High-concurrency bulk URL health probe powered by Fastify, BullMQ, Redis, PostgreSQL, and Next.js.'
};

const RootLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {children}
          </main>
          <footer style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            ProbePulse Bulk URL Health Checker • Node.js, Fastify, BullMQ, Redis, PostgreSQL & Next.js
          </footer>
        </div>
      </body>
    </html>
  );
};

export default RootLayout;

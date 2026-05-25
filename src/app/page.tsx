import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header
        className="glass-panel"
        style={{
          margin: '24px 24px 0 24px',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '1.25rem',
            }}
          >
            A
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
            Aura Attendance
          </span>
        </div>
        
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <main
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '64px', maxWidth: '800px' }}>
          <div
            className="badge badge-present"
            style={{
              marginBottom: '16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              padding: '6px 16px',
            }}
          >
            Institutional ERP Suite v1.0
          </div>
          <h1 className="title-xl" style={{ fontSize: '3.5rem', marginBottom: '20px', lineHeight: '1.15' }}>
            Next-Gen School <span style={{ color: 'var(--color-primary)' }}>Attendance ERP</span>
          </h1>
          <p className="desc-sm" style={{ fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto 32px auto' }}>
            Track daily records, manage classrooms rosters, and trigger automated WhatsApp parent alerts instantly from one beautiful interface.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: '14px 32px', borderRadius: '10px' }}>
              Launch Workspace
            </Link>
            <a href="#features" className="btn btn-secondary" style={{ padding: '14px 32px', borderRadius: '10px' }}>
              Explore Features
            </a>
          </div>
        </div>

        {/* Dynamic Metric Widgets */}
        <section className="grid-cols-3" style={{ width: '100%', margin: '0 auto' }}>
          <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>342</div>
            <div className="title-md">Enrolled Students</div>
            <p className="desc-sm">All students categorized under respective grades and sections with parent contact logs.</p>
          </div>

          <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>96.4%</div>
            <div className="title-md">Daily Attendance</div>
            <p className="desc-sm">Real-time attendance ratios calculated automatically for the current academic session.</p>
          </div>

          <div className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                color: 'var(--color-info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>14</div>
            <div className="title-md">Active Classes</div>
            <p className="desc-sm">Classrooms sections managed by dedicated subject teachers and institutional staff.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '24px',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-dim)',
          backgroundColor: 'var(--background-alt)',
        }}
      >
        © 2026 Aura Attendance ERP. All rights reserved. Licensed to Institutional Administrators.
      </footer>
    </div>
  );
}

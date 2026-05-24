'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('Teacher');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch logged in user profile details
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const data = await res.json();
          if (data?.username) {
            // Capitalize first letter or format beautifully
            const name = data.username.charAt(0).toUpperCase() + data.username.slice(1);
            setUserName(name);
          }
        }
      } catch (err) {
        console.error('Failed to load user info', err);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  const navLinks = [
    {
      name: 'Overview Hub',
      path: '/dashboard',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      name: 'Mark Attendance',
      path: '/dashboard/attendance',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      name: 'Parent Alerts Log',
      path: '/dashboard/alerts',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
    },
    {
      name: 'Roster & Ledger',
      path: '/dashboard/directory',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="23" y1="21" x2="23" y2="19" />
          <line x1="19" y1="21" x2="19" y2="19" />
          <line x1="21" y1="15" x2="21" y2="21" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Mobile Top Header */}
      <header
        style={{
          display: 'none',
          padding: '12px 20px',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-dim)',
          backgroundColor: 'var(--surface-overlay)',
          backdropFilter: 'var(--glass-blur)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
        className="mobile-header-active"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              padding: '4px',
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.02em', color: 'var(--color-primary)' }}>
            AURA Attendance
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Layout Container */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {/* Navigation Sidebar Panel */}
        <aside
          style={{
            width: '260px',
            borderRight: '1px solid var(--border-dim)',
            backgroundColor: 'var(--surface-overlay)',
            backdropFilter: 'var(--glass-blur)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 20px',
            position: 'sticky',
            top: 0,
            height: '100vh',
            zIndex: 30,
            transition: 'var(--transition-smooth)',
          }}
          className={`sidebar-responsive ${mobileMenuOpen ? 'sidebar-open' : ''}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Branding Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  Aura Attendance
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  School Management ERP
                </span>
              </div>
            </div>

            {/* Navigation Options List */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'var(--background-alt)' : 'transparent',
                      border: isActive ? '1px solid var(--border-dim)' : '1px solid transparent',
                      transition: 'var(--transition-fast)',
                    }}
                    className="nav-link-hover"
                  >
                    <span style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                      {link.icon}
                    </span>
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Theme Toggle Wrapper (Desktop only) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }} className="desktop-toggle-only">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Theme Mode</span>
              <ThemeToggle />
            </div>

            {/* Dynamic Teacher Profile Panel */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--background-alt)',
                border: '1px solid var(--border-dim)',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {userName.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  School Administrator
                </span>
              </div>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--color-danger)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
              }}
              className="btn-danger-hover"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        {/* Backdrop for open mobile navigation */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 25,
            }}
          />
        )}

        {/* Dashboard Main Workspace */}
        <main
          style={{
            flex: 1,
            padding: '40px 32px',
            backgroundColor: 'var(--background-default)',
            minHeight: '100vh',
            overflowY: 'auto',
          }}
          className="main-responsive"
        >
          {children}
        </main>
      </div>

      {/* Styling tweaks injected for seamless responsiveness */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-header-active {
            display: flex !important;
          }
          .sidebar-responsive {
            position: fixed !important;
            left: -260px !important;
            top: 57px !important;
            height: calc(100vh - 57px) !important;
            width: 260px !important;
          }
          .sidebar-open {
            left: 0 !important;
          }
          .desktop-toggle-only {
            display: none !important;
          }
          .main-responsive {
            padding: 24px 16px !important;
          }
        }
        .nav-link-hover:hover {
          background-color: var(--background-alt) !important;
          color: var(--color-primary) !important;
          transform: translateX(4px);
        }
        .btn-danger-hover:hover {
          background-color: var(--color-danger) !important;
          color: #fff !important;
          border-color: var(--color-danger) !important;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
      `}</style>
    </div>
  );
}

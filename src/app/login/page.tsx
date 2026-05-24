'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Authenticated! Redirect immediately to callbackUrl or dashboard
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError('A connection error occurred. Please verify your server is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: 'linear-gradient(135deg, var(--background-default) 0%, var(--background-alt) 100%)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Navigation Back */}
        <Link
          href="/"
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            fontWeight: '500',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Home
        </Link>

        {/* Branding header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '1.5rem',
              margin: '0 auto 16px auto',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            A
          </div>
          <h2 className="title-lg" style={{ marginBottom: '8px' }}>
            Aura ERP Sign In
          </h2>
          <p className="desc-sm">Enter your administrator credentials to access student daily lists.</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label" htmlFor="email-input">
              Academic Email
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              placeholder="name@school.edu"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label" htmlFor="password-input">
              Access Password
            </label>
            <input
              id="password-input"
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '14px',
              borderRadius: '10px',
              width: '100%',
              marginTop: '8px',
              position: 'relative',
              overflow: 'hidden',
            }}
            disabled={loading}
          >
            {loading ? (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : (
              'Sign In to Workspace'
            )}
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </button>
        </form>

        {/* License credentials hint for easier local review */}
        <div
          style={{
            borderTop: '1px dashed var(--border-dim)',
            paddingTop: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span>Institutional Test credentials:</span>
          <strong>teacher@aura.edu / Aura123!</strong>
        </div>
      </div>
    </div>
  );
}

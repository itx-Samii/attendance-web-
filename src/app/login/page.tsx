'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration / Application states
  const [isRegistering, setIsRegistering] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    try {
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          principalName,
          principalEmail: regEmail,
          password: regPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRegSuccess(
          'Your school application has been submitted successfully! It is currently pending review by the platform Super Administrator.'
        );
        setSchoolName('');
        setPrincipalName('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setRegError(data.error || 'Failed to submit school application.');
      }
    } catch (err) {
      console.error('Registration submit error:', err);
      setRegError('A connection error occurred. Please verify your server is active.');
    } finally {
      setRegLoading(false);
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
          maxWidth: '460px',
          padding: '40px',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          transition: 'all 0.3s ease',
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
              backgroundColor: isRegistering ? '#f59e0b' : 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '1.5rem',
              margin: '0 auto 16px auto',
              boxShadow: isRegistering ? '0 8px 20px rgba(245,158,11,0.3)' : 'var(--shadow-glow)',
              transition: 'all 0.3s ease',
            }}
          >
            A
          </div>
          <h2 className="title-lg" style={{ marginBottom: '8px', transition: 'all 0.3s ease' }}>
            {isRegistering ? 'Register Your School' : 'Aura ERP Sign In'}
          </h2>
          <p className="desc-sm">
            {isRegistering
              ? 'Apply for a multi-tenant license key to manage your classrooms separately.'
              : 'Enter your credentials to mark daily rosters and manage alerts.'}
          </p>
        </div>

        {/* LOGIN MODE */}
        {!isRegistering && (
          <>
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
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                      margin: '0 auto',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                ) : (
                  'Sign In to Workspace'
                )}
              </button>
            </form>

            {/* Switch to Register */}
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                onClick={() => { setIsRegistering(true); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                🏫 Are you a School Principal? Request License Application
              </button>
            </div>
          </>
        )}

        {/* REGISTRATION MODE */}
        {isRegistering && (
          <>
            {/* Status Messages */}
            {regError && (
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
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: '10px',
                  padding: '16px',
                  color: '#22c55e',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  lineHeight: '1.6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800 }}>
                  <span>✓</span> Application Filed
                </div>
                <span>{regSuccess}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: '0' }}>
                <label className="form-label">School Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Beacon Hill Academy"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  disabled={regLoading}
                />
              </div>

              <div className="form-group" style={{ margin: '0' }}>
                <label className="form-label">Principal Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dr. Thomas Wayne"
                  required
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  disabled={regLoading}
                />
              </div>

              <div className="form-group" style={{ margin: '0' }}>
                <label className="form-label">Principal Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="principal@school.edu"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={regLoading}
                />
              </div>

              <div className="form-group" style={{ margin: '0' }}>
                <label className="form-label">Create Access Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={regLoading}
                />
              </div>

              <button
                type="submit"
                className="btn"
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  width: '100%',
                  marginTop: '8px',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  boxShadow: '0 8px 16px rgba(245,158,11,0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                disabled={regLoading}
              >
                {regLoading ? (
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
                  'Submit Registration File'
                )}
              </button>
            </form>

            {/* Switch to Login */}
            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <button
                onClick={() => { setIsRegistering(false); setRegError(null); setRegSuccess(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                🔑 Already have an approved school? Sign In
              </button>
            </div>
          </>
        )}

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
            gap: '6px',
          }}
        >
          <span>Test Platform Login details:</span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span><strong>testadmin@aura.edu</strong></span>
            
          </div>
          <div>
          <span>Password:<strong>Test123</strong>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

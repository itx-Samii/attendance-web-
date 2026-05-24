'use client';

import React, { useState, useEffect, useTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SystemSettings } from '@/app/api/settings/route';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    schoolName: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    useSimulator: true,
    smsTemplate: '',
  });

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showAuthToken, setShowAuthToken] = useState(false);

  // Mock student for preview card
  const mockStudent = {
    name: 'Aiden Smith',
    roll: '9A-01',
    class: 'Grade 9 - Section A',
    date: new Date().toISOString().split('T')[0],
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        } else {
          showToast('Failed to load system settings.', 'error');
        }
      } catch (err) {
        console.error('Failed to load configurations:', err);
        showToast('Network error while loading settings.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInputChange = (
    key: keyof SystemSettings,
    val: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = () => {
    if (!settings.schoolName.trim()) {
      showToast('School Name is required.', 'error');
      return;
    }
    if (!settings.smsTemplate.trim()) {
      showToast('Parent Alert Template cannot be empty.', 'error');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });

        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
          showToast('System configuration saved atomically!');
          // Refresh the page or trigger layout title updates
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          showToast('Failed to save settings to JSON server.', 'error');
        }
      } catch (err) {
        console.error('Failed to save settings:', err);
        showToast('Network error while saving.', 'error');
      }
    });
  };

  // Interpolation preview helper
  const getPreviewText = () => {
    if (!settings.smsTemplate) return '';
    return settings.smsTemplate
      .replace(/{student_name}/gi, mockStudent.name)
      .replace(/{name}/gi, mockStudent.name)
      .replace(/{roll_number}/gi, mockStudent.roll)
      .replace(/{roll}/gi, mockStudent.roll)
      .replace(/{class_name}/gi, mockStudent.class)
      .replace(/{class}/gi, mockStudent.class)
      .replace(/{date}/gi, mockStudent.date);
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`toast-notification ${toast.type}`}
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              padding: '16px 24px',
              borderRadius: '10px',
              backgroundColor: toast.type === 'success' ? 'var(--color-primary)' : '#ef4444',
              color: '#fff',
              fontWeight: 600,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'slideIn 0.3s ease forwards',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {toast.type === 'success' ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              )}
            </svg>
            <span style={{ fontSize: '0.9rem' }}>{toast.text}</span>
          </div>
        )}

        {/* Page Title Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 850, letterSpacing: '-0.03em', margin: 0 }}>
              System Settings
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
              Configure school identity details, baseline parent alert rules, and SMS gateway credentials.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending || loading}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: (isPending || loading) ? 'not-allowed' : 'pointer',
              opacity: (isPending || loading) ? 0.65 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {isPending ? 'Saving System Changes...' : 'Save Configuration'}
          </button>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <span className="pulse-indicator" style={{ width: '24px', height: '24px' }}></span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Loading database configurations...
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* Row 1: School Identity details */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-primary)' }}>🏫</span> School Profile Identity
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                  School/Institution Name
                </label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => handleInputChange('schoolName', e.target.value)}
                  placeholder="e.g. Aura Academy of Excellence"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-dim)',
                    backgroundColor: 'var(--background-alt)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  This title updates the primary layout branding header and institutional dashboards dynamically.
                </p>
              </div>
            </div>

            {/* Row 2: Twilio Credentials Configuration */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--color-primary)' }}>💬</span> Twilio API Gateway Credentials
                </h2>
                
                {/* Simulator Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Sandbox Simulator Mode:
                  </span>
                  <button
                    onClick={() => handleInputChange('useSimulator', !settings.useSimulator)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: settings.useSimulator ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: settings.useSimulator ? 'var(--color-warning)' : '#22c55e',
                      boxShadow: settings.useSimulator ? '0 0 10px rgba(234,179,8,0.1)' : '0 0 10px rgba(34,197,94,0.1)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {settings.useSimulator ? 'ACTIVE (Console Sandbox)' : 'INACTIVE (Real API Alerts)'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {/* Twilio Account SID */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Twilio Account SID
                  </label>
                  <input
                    type="text"
                    value={settings.twilioAccountSid}
                    onChange={(e) => handleInputChange('twilioAccountSid', e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Twilio Phone Number */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Twilio Sender Phone Number
                  </label>
                  <input
                    type="text"
                    value={settings.twilioPhoneNumber}
                    onChange={(e) => handleInputChange('twilioPhoneNumber', e.target.value)}
                    placeholder="+1501XXXXXXX"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Twilio Auth Token (Full Row) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                  Twilio Auth Token
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showAuthToken ? 'text' : 'password'}
                    value={settings.twilioAuthToken}
                    onChange={(e) => handleInputChange('twilioAuthToken', e.target.value)}
                    placeholder="enter your twilio secure secret token"
                    style={{
                      width: '100%',
                      padding: '12px 50px 12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      outline: 'none',
                      letterSpacing: showAuthToken ? 'normal' : '0.2em',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                    }}
                  >
                    {showAuthToken ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  All credentials are saved securely in atomic JSON arrays local datasets. Sandbox Simulator operates locally when variables are empty.
                </p>
              </div>
            </div>

            {/* Row 3: SMS Alerts Template & Live Preview */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-primary)' }}>✏️</span> Parent Alert Message Rules
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }} className="grid-responsive-settings">
                {/* Template Editing Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Absent Notification Template
                  </label>
                  
                  <textarea
                    rows={5}
                    value={settings.smsTemplate}
                    onChange={(e) => handleInputChange('smsTemplate', e.target.value)}
                    placeholder="Enter template text..."
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      outline: 'none',
                      lineHeight: '1.5',
                      resize: 'none',
                    }}
                  />

                  {/* Variables Guide */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Available Dynamic Placeholder Tokens:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['{name}', '{roll}', '{class}', '{date}'].map((tag) => (
                        <span
                          key={tag}
                          onClick={() => {
                            // Append dynamic token at cursor or end of template
                            handleInputChange('smsTemplate', settings.smsTemplate + ' ' + tag);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--border-dim)',
                            color: 'var(--text-primary)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            cursor: 'pointer',
                          }}
                          title={`Insert ${tag}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Real-time Dynamic Preview Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Real-time SMS Output Preview
                  </label>

                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      minHeight: '160px',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* Header bar of simulated mobile message */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifySelf: 'center', color: '#fff', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'center' }}>
                        A
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 750 }}>
                          {settings.schoolName || 'Aura Attendance ERP'}
                        </h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Alert Broadcast Gateway
                        </span>
                      </div>
                    </div>

                    {/* Simulated Text Body bubble */}
                    <div
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: 'var(--border-dim)',
                        padding: '12px 16px',
                        borderRadius: '0 16px 16px 16px',
                        maxWidth: '90%',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                      }}
                    >
                      {getPreviewText() || (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                          Add variables and template text to see output preview here.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .grid-responsive-settings {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .grid-responsive-settings {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

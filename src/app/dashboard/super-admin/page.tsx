'use client';

import React, { useState, useEffect, useTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface School {
  schoolId: string;
  schoolName: string;
  principalEmail: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: string;
  useSimulator: boolean;
  whatsappEnabled: boolean;
  smsTemplate: string;
  licenseKey: string;
  licenseStatus: 'Active' | 'Trial' | 'Expired' | 'Suspended';
  licenseExpiry: string;
  licenseLimitClasses: number;
}

export default function SuperAdminPanel() {
  const [userRole, setUserRole] = useState<string>('teacher');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit license state
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<School['licenseStatus']>('Active');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licenseLimit, setLicenseLimit] = useState(25);

  // Direct Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newPrincipalName, setNewPrincipalName] = useState('');
  const [newPrincipalEmail, setNewPrincipalEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset Password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [schoolToResetPassword, setSchoolToResetPassword] = useState<School | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'registry' | 'license'>('overview');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  async function loadSchools() {
    try {
      setLoading(true);
      const res = await fetch('/api/schools');
      if (res.ok) {
        const data = await res.json();
        setSchools(data);
      }
    } catch (err) {
      console.error('Failed to load schools registry:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setCheckingAuth(true);
        const userRes = await fetch('/api/auth/user');
        if (userRes.ok) {
          const userData = await userRes.json();
          const role = userData?.user?.role || 'teacher';
          setUserRole(role);
          if (role !== 'superadmin') {
            setCheckingAuth(false);
            setLoading(false);
            return;
          }
        }
        await loadSchools();
      } catch (err) {
        console.error('Super admin load error:', err);
      } finally {
        setCheckingAuth(false);
      }
    }
    load();
  }, []);

  const handleUpdateSchoolStatus = (schoolId: string, status: 'active' | 'suspended') => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/schools', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId, status }),
        });
        if (res.ok) {
          showToast(status === 'active' ? 'School account approved successfully!' : 'School account suspended.');
          loadSchools();
        } else {
          showToast('Failed to update school status.', 'error');
        }
      } catch {
        showToast('Network error.', 'error');
      }
    });
  };

  const handleSaveLicense = () => {
    if (!selectedSchool) return;
    startTransition(async () => {
      try {
        const res = await fetch('/api/schools', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: selectedSchool.schoolId,
            licenseKey,
            licenseStatus,
            licenseExpiry,
            licenseLimitClasses: licenseLimit,
          }),
        });
        if (res.ok) {
          showToast('License terms updated successfully!');
          loadSchools();
          setSelectedSchool(null);
        } else {
          showToast('Failed to update license parameters.', 'error');
        }
      } catch {
        showToast('Network error.', 'error');
      }
    });
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newPrincipalName.trim() || !newPrincipalEmail.trim() || !newPassword.trim()) {
      showToast('All fields are required.', 'error');
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: newSchoolName,
          principalName: newPrincipalName,
          principalEmail: newPrincipalEmail,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('School registered successfully with active license!');
        setShowCreateModal(false);
        setNewSchoolName('');
        setNewPrincipalName('');
        setNewPrincipalEmail('');
        setNewPassword('');
        loadSchools();
      } else {
        showToast(data.error || 'Failed to register school.', 'error');
      }
    } catch {
      showToast('Network error while provisioning school.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolToResetPassword || !resetPasswordValue.trim()) return;

    try {
      setResettingPassword(true);
      const res = await fetch('/api/schools', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: schoolToResetPassword.schoolId,
          principalPassword: resetPasswordValue.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Principal's password updated successfully!");
        setShowResetModal(false);
        setSchoolToResetPassword(null);
        setResetPasswordValue('');
      } else {
        showToast(data?.error || 'Failed to update password.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // Access denied for non-superadmins
  if (!checkingAuth && userRole !== 'superadmin') {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
          <div style={{
            padding: '48px', maxWidth: '440px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(239,68,68,0.02))',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          }}>
            <div style={{ fontSize: '3rem' }}>🔐</div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>Super Admin Only</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              This panel is restricted to Platform Super Administrators only. Please sign in as a Super Admin to proceed.
            </p>
            <button onClick={() => window.location.href = '/dashboard'}
              style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const sections = [
    { id: 'overview', label: 'Platform Overview', icon: '📊' },
    { id: 'registry', label: 'Schools registry & applications', icon: '🏫' },
  ] as const;

  // Platform metrics
  const totalSchools = schools.length;
  const pendingApps = schools.filter(s => s.status === 'pending').length;
  const activeSchools = schools.filter(s => s.status === 'active').length;
  const suspendedSchools = schools.filter(s => s.status === 'suspended').length;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
            padding: '14px 22px', borderRadius: '10px', fontWeight: 600, fontSize: '0.9rem',
            backgroundColor: toast.type === 'success' ? 'var(--color-primary)' : '#ef4444',
            color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'slideInRight 0.3s ease',
          }}>
            {toast.type === 'success' ? '✓' : '⚠️'} {toast.text}
          </div>
        )}

        {/* Hero Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.08) 50%, rgba(59,130,246,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '20px', padding: '32px 36px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
            }}>🛡️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #f59e0b, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Platform Super Admin Portal
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Super Administrator central hub — licensing, registrations, and school approvals
              </p>
            </div>
          </div>

          <button onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              boxShadow: '0 4px 16px rgba(245,158,11,0.45)',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease',
            }}>
            🏫 Register School Account
          </button>
        </div>

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {sections.map(sec => (
            <button key={sec.id} onClick={() => { setActiveSection(sec.id); setSelectedSchool(null); }}
              style={{
                padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.86rem',
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: activeSection === sec.id ? '#f59e0b' : 'var(--background-alt)',
                color: activeSection === sec.id ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${activeSection === sec.id ? '#f59e0b' : 'var(--border-dim)'}`,
                boxShadow: activeSection === sec.id ? '0 4px 14px rgba(245,158,11,0.35)' : 'none',
                transition: 'all 0.2s ease',
              }}>
              {sec.icon} {sec.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
            <span className="pulse-indicator" style={{ width: '20px', height: '20px' }} />
            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading platform data...</span>
          </div>
        ) : (
          <>
            {/* ── SECTION: OVERVIEW ─────────────────────────── */}
            {activeSection === 'overview' && !selectedSchool && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Total Schools', value: totalSchools, icon: '🏫', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                    { label: 'Pending Applications', value: pendingApps, icon: '📋', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', highlight: pendingApps > 0 },
                    { label: 'Active School Licenses', value: activeSchools, icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                    { label: 'Suspended Schools', value: suspendedSchools, icon: '🚫', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      padding: '24px', borderRadius: '14px',
                      backgroundColor: stat.bg, border: `1px solid ${stat.color}33`,
                      display: 'flex', flexDirection: 'column', gap: '8px',
                      position: 'relative',
                      boxShadow: stat.highlight ? '0 0 15px rgba(59,130,246,0.2)' : 'none',
                    }}>
                      <div style={{ fontSize: '1.8rem' }}>{stat.icon}</div>
                      <div style={{ fontSize: '2.2rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {stat.label}
                      </div>
                      {stat.highlight && (
                        <span style={{ position: 'absolute', top: '12px', right: '12px', padding: '3px 8px', borderRadius: '20px', backgroundColor: '#3b82f6', color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>ATTENTION</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Main Pending Approvals Panel */}
                <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
                  <h2 style={{ margin: '0 0 20px', fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📋 Pending License Applications
                    {pendingApps > 0 && (
                      <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 800 }}>{pendingApps} Awaiting</span>
                    )}
                  </h2>

                  {pendingApps === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                      <p style={{ margin: 0, fontWeight: 600 }}>All school applications are cleared! No pending requests.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-dim)' }}>
                            {['School Name', 'Principal Email', 'License Request', 'Action'].map(h => (
                              <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {schools.filter(s => s.status === 'pending').map((s) => (
                            <tr key={s.schoolId} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                              <td style={{ padding: '16px 14px', fontWeight: 700, fontSize: '0.92rem' }}>{s.schoolName}</td>
                              <td style={{ padding: '16px 14px', fontSize: '0.84rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.principalEmail}</td>
                              <td style={{ padding: '16px 14px' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                                  10 Sections Trial
                                </span>
                              </td>
                              <td style={{ padding: '16px 14px' }}>
                                <button onClick={() => handleUpdateSchoolStatus(s.schoolId, 'active')}
                                  style={{
                                    padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    backgroundColor: '#22c55e', color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                                    boxShadow: '0 4px 10px rgba(34,197,94,0.25)',
                                    transition: 'all 0.15s ease',
                                  }}>
                                  Allow & Approve
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SECTION: REGISTRY ─────────────────────────── */}
            {activeSection === 'registry' && !selectedSchool && (
              <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    🏫 Platform School Registries <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', backgroundColor: 'var(--border-dim)', color: 'var(--text-muted)' }}>{totalSchools} registered</span>
                  </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-dim)' }}>
                        {['School Name', 'Principal Email', 'Status', 'Expiry', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schools.map((s) => {
                        const statusColor = s.status === 'active' ? '#22c55e' : s.status === 'pending' ? '#3b82f6' : '#ef4444';
                        return (
                          <tr key={s.schoolId} style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background 0.15s ease' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.015)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                            <td style={{ padding: '16px 14px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{s.schoolName}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>ID: {s.schoolId}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 14px', fontSize: '0.84rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.principalEmail}</td>
                            <td style={{ padding: '16px 14px' }}>
                              <span style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                                backgroundColor: `${statusColor}15`, color: statusColor,
                                border: `1px solid ${statusColor}30`,
                              }}>{s.status}</span>
                            </td>
                            <td style={{ padding: '16px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              {s.licenseExpiry || '—'}
                            </td>
                            <td style={{ padding: '16px 14px' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={() => {
                                  setSelectedSchool(s);
                                  setLicenseKey(s.licenseKey || '');
                                  setLicenseStatus(s.licenseStatus || 'Active');
                                  setLicenseExpiry(s.licenseExpiry || '');
                                  setLicenseLimit(s.licenseLimitClasses || 25);
                                }}
                                  style={{
                                    padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-dim)',
                                    backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}>
                                  🔑 License
                                </button>

                                <button onClick={() => {
                                  setSchoolToResetPassword(s);
                                  setResetPasswordValue('');
                                  setShowResetModal(true);
                                }}
                                  style={{
                                    padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.3)',
                                    backgroundColor: 'rgba(59,130,246,0.08)', color: '#3b82f6',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.15)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)';
                                  }}
                                >
                                  🔒 Reset PW
                                </button>
                                
                                {s.status === 'pending' && (
                                  <button onClick={() => handleUpdateSchoolStatus(s.schoolId, 'active')}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                      backgroundColor: '#22c55e', color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                                    }}>
                                    Approve
                                  </button>
                                )}

                                {s.status === 'active' && (
                                  <button onClick={() => handleUpdateSchoolStatus(s.schoolId, 'suspended')}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                                      backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700,
                                      border: '1px solid rgba(239,68,68,0.2)',
                                    }}>
                                    Suspend
                                  </button>
                                )}

                                {s.status === 'suspended' && (
                                  <button onClick={() => handleUpdateSchoolStatus(s.schoolId, 'active')}
                                    style={{
                                      padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                      backgroundColor: '#22c55e', color: '#fff', fontSize: '0.78rem', fontWeight: 700,
                                    }}>
                                    Unsuspend
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── LICENSE CONSOLE CARD (Sub-view when school is selected) ─────────── */}
            {selectedSchool && (
              <div className="glass-panel" style={{ padding: '32px', border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🛠️ License Editor — {selectedSchool.schoolName}
                  </h2>
                  <button onClick={() => setSelectedSchool(null)}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-dim)',
                      backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    }}>
                    ← Back to List
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>License Activation Key</label>
                    <input type="text" value={licenseKey} onChange={e => setLicenseKey(e.target.value)}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>License Status</label>
                    <select value={licenseStatus} onChange={e => setLicenseStatus(e.target.value as any)}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      <option value="Active">Active</option>
                      <option value="Trial">Trial Mode</option>
                      <option value="Expired">Expired</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expiry Date</label>
                    <input type="date" value={licenseExpiry} onChange={e => setLicenseExpiry(e.target.value)}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classroom Limit</label>
                    <input type="number" value={licenseLimit} onChange={e => setLicenseLimit(Number(e.target.value))}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setSelectedSchool(null)}
                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveLicense} disabled={isPending}
                    style={{
                      padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      backgroundColor: '#f59e0b', color: '#fff', fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    }}>
                    {isPending ? 'Updating...' : 'Save License Terms'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '500px', padding: '36px', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>🏫 Register New School Account</h3>
              <button onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>School Name</label>
                <input type="text" placeholder="e.g. Beacon Hill Academy" value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)} required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Principal Full Name</label>
                <input type="text" placeholder="e.g. Dr. Arthur Dent" value={newPrincipalName} onChange={e => setNewPrincipalName(e.target.value)} required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Principal Email Address</label>
                <input type="email" placeholder="principal@school.edu" value={newPrincipalEmail} onChange={e => setNewPrincipalEmail(e.target.value)} required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>Create Principal Password</label>
                <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
                    backgroundColor: '#f59e0b', color: '#fff', fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    opacity: creating ? 0.7 : 1,
                  }}>
                  {creating ? 'Creating school...' : 'Provision School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && schoolToResetPassword && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '440px', padding: '36px', borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 Reset Principal Password
              </h3>
              <button onClick={() => { setShowResetModal(false); setSchoolToResetPassword(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Enter a new security password for the principal account of <strong>{schoolToResetPassword.schoolName}</strong> (<strong>{schoolToResetPassword.principalEmail}</strong>).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>New Password</label>
                <input type="text" placeholder="Enter new password" value={resetPasswordValue} onChange={e => setResetPasswordValue(e.target.value)} required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => { setShowResetModal(false); setSchoolToResetPassword(null); }}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={resettingPassword}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: resettingPassword ? 'not-allowed' : 'pointer',
                    backgroundColor: '#f59e0b', color: '#fff', fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                    opacity: resettingPassword ? 0.7 : 1,
                  }}>
                  {resettingPassword ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardLayout>
  );
}

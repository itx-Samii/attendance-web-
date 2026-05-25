'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { SystemSettings } from '@/app/api/settings/route';

interface StaffUser {
  email: string;
  name: string;
  role: 'admin' | 'teacher';
  password?: string;
  classId?: string;
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<'gateway' | 'staff' | 'license' | 'security'>('gateway');
  
  // Settings state
  const [settings, setSettings] = useState<SystemSettings>({
    schoolName: '',
    useSimulator: true,
    whatsappEnabled: false,
    smsTemplate: '',
  });

  // WhatsApp connection state
  const [waStatus, setWaStatus] = useState<'initialising' | 'qr' | 'ready' | 'disconnected'>('disconnected');
  const [waQrUrl, setWaQrUrl] = useState<string | null>(null);
  const [waDisconnecting, setWaDisconnecting] = useState(false);

  // Auth/Role states
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'superadmin'>('teacher');
  const [userEmail, setUserEmail] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Staff registry states
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // New staff form states
  const [newStaffModalOpen, setNewStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'teacher'>('teacher');
  const [newStaffClassId, setNewStaffClassId] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState('');

  // Edit staff states
  const [editStaffModalOpen, setEditStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffUser | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'admin' | 'teacher'>('teacher');
  const [editStaffClassId, setEditStaffClassId] = useState('');
  const [editStaffPassword, setEditStaffPassword] = useState('');
  const [classes, setClasses] = useState<{ classId: string; name: string }[]>([]);

  // Delete staff states
  const [deleteStaffModalOpen, setDeleteStaffModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffUser | null>(null);
  const [staffDeleting, setStaffDeleting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Mock student for preview card
  const mockStudent = {
    name: 'Aiden Smith',
    roll: '9A-01',
    class: 'Grade 9 - Section A',
    date: new Date().toISOString().split('T')[0],
  };

  // Poll WhatsApp status every 3 seconds when on gateway tab
  const pollWhatsAppStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data.status);
        setWaQrUrl(data.qrDataUrl || null);
      }
    } catch { /* ignore poll errors silently */ }
  }, []);

  useEffect(() => {
    if (activeTab !== 'gateway') return;
    pollWhatsAppStatus();
    const interval = setInterval(pollWhatsAppStatus, 3000);
    return () => clearInterval(interval);
  }, [activeTab, pollWhatsAppStatus]);

  useEffect(() => {
    async function loadInitial() {
      try {
        setCheckingAuth(true);
        const resUser = await fetch('/api/auth/user');
        if (resUser.ok) {
          const userData = await resUser.json();
          const role = userData?.user?.role || 'teacher';
          setUserRole(role);
          setUserEmail(userData?.user?.email || '');

          if (role === 'teacher' || role === 'superadmin') {
            setActiveTab('security');
          } else {
            setActiveTab('gateway');
          }

          if (role === 'admin') {
            const res = await fetch('/api/settings');
            if (res.ok) {
              const data = await res.json();
              setSettings(data);
            }
          }

          if (role === 'admin') {
            const resClasses = await fetch('/api/classes');
            if (resClasses.ok) {
              const classesData = await resClasses.json();
              setClasses(classesData);
              if (classesData.length > 0) {
                setNewStaffClassId(classesData[0].classId);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load settings identity checks:', err);
      } finally {
        setCheckingAuth(false);
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Fetch staff users list when switching to staff tab
  useEffect(() => {
    if (activeTab === 'staff' && userRole === 'admin') {
      loadStaffList();
    }
  }, [activeTab]);

  const loadStaffList = async () => {
    try {
      setLoadingStaff(true);
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
      showToast('Failed to load staff directory.', 'error');
    } finally {
      setLoadingStaff(false);
    }
  };

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
    if (userRole !== 'admin') return;
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
          showToast('System configuration saved successfully!');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Failed to save settings.', 'error');
        }
      } catch (err) {
        console.error('Failed to save settings:', err);
        showToast('Network error while saving.', 'error');
      }
    });
  };

  const handleWhatsAppDisconnect = async () => {
    setWaDisconnecting(true);
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setWaStatus('disconnected');
      setWaQrUrl(null);
      showToast('WhatsApp session disconnected. Scan the QR code to reconnect.');
    } catch {
      showToast('Failed to disconnect WhatsApp session.', 'error');
    } finally {
      setWaDisconnecting(false);
    }
  };

  // Staff CRUD actions
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      setStaffError('All input fields are required.');
      return;
    }

    try {
      setStaffSaving(true);
      setStaffError('');
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          password: newStaffPassword,
          role: newStaffRole,
          classId: newStaffRole === 'teacher' ? newStaffClassId : undefined,
        }),
      });

      if (res.ok) {
        showToast('Staff member registered successfully!');
        setNewStaffModalOpen(false);
        // Reset form
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPassword('');
        setNewStaffRole('teacher');
        setNewStaffClassId(classes[0]?.classId || '');
        loadStaffList();
      } else {
        const data = await res.json();
        setStaffError(data?.error || 'Registration failed.');
      }
    } catch (err) {
      console.error(err);
      setStaffError('Network error registering staff.');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffToEdit || !editStaffName.trim()) return;

    try {
      setStaffSaving(true);
      setStaffError('');
      const res = await fetch('/api/auth/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: staffToEdit.email,
          name: editStaffName,
          role: editStaffRole,
          password: editStaffPassword || undefined,
          classId: editStaffRole === 'teacher' ? editStaffClassId : undefined,
        }),
      });

      if (res.ok) {
        showToast('Staff details updated successfully!');
        setEditStaffModalOpen(false);
        setEditStaffPassword('');
        loadStaffList();
      } else {
        const data = await res.json();
        setStaffError(data?.error || 'Update failed.');
      }
    } catch (err) {
      console.error(err);
      setStaffError('Network error updating details.');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;

    try {
      setStaffDeleting(true);
      const res = await fetch('/api/auth/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffToDelete.email }),
      });

      if (res.ok) {
        showToast('Staff account purged successfully!');
        setDeleteStaffModalOpen(false);
        loadStaffList();
      } else {
        const data = await res.json();
        showToast(data?.error || 'Failed to purge account.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while deleting staff.', 'error');
    } finally {
      setStaffDeleting(false);
    }
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and password confirmation do not match.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      return;
    }

    try {
      setPasswordSubmitting(true);
      const res = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        showToast('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        setPasswordError(data?.error || 'Failed to change password.');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Network error changing password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Standard role checks are handled dynamically inside tab menus  }

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
              System Settings ERP
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
              {userRole === 'teacher' 
                ? 'Update your portal credentials to keep your account secure.' 
                : userRole === 'superadmin' 
                ? 'Manage platform licensing activation, metrics, and security keys.' 
                : 'Configure WhatsApp gateway, school identity, parent alert templates, and staff registries.'}
            </p>
          </div>

          {activeTab === 'gateway' && (
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
              {isPending ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          )}
        </div>

        {/* Tabs Bar */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-dim)', paddingBottom: '2px' }}>
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('gateway')}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: activeTab === 'gateway' ? 'var(--color-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'gateway' ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'var(--transition-smooth)',
              }}
            >
              💬 Gateway & Profile
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('staff')}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: activeTab === 'staff' ? 'var(--color-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'staff' ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'var(--transition-smooth)',
              }}
            >
              👥 Staff Directory (RBAC)
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('license')}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: activeTab === 'license' ? 'var(--color-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'license' ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition: 'var(--transition-smooth)',
              }}
            >
              🔑 Active School License
            </button>
          )}
          <button
            onClick={() => setActiveTab('security')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: activeTab === 'security' ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'security' ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'var(--transition-smooth)',
            }}
          >
            🔒 Change Password
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
        ) : (activeTab === 'gateway' && userRole === 'admin') ? (
          /* TAB 1: General Profile & Twilio Settings */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* School Identity */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              </div>
            </div>

          {/* WhatsApp Gateway Panel */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#25D366' }}>📱</span> WhatsApp Notification Gateway
                </h2>

                {/* Live status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700,
                    backgroundColor: waStatus === 'ready' ? 'rgba(37,211,102,0.15)'
                      : waStatus === 'qr' ? 'rgba(234,179,8,0.15)'
                      : waStatus === 'initialising' ? 'rgba(59,130,246,0.15)'
                      : 'rgba(239,68,68,0.1)',
                    color: waStatus === 'ready' ? '#25D366'
                      : waStatus === 'qr' ? 'var(--color-warning)'
                      : waStatus === 'initialising' ? 'var(--color-primary)'
                      : '#ef4444',
                  }}>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      backgroundColor: 'currentColor',
                      animation: waStatus === 'initialising' || waStatus === 'qr' ? 'pulse-dot 1.2s infinite' : 'none',
                    }} />
                    {waStatus === 'ready' ? '✓ Connected'
                      : waStatus === 'qr' ? 'Awaiting QR Scan'
                      : waStatus === 'initialising' ? 'Initialising...'
                      : 'Disconnected'}
                  </span>

                  {/* Simulator toggle */}
                  <button
                    onClick={() => handleInputChange('useSimulator', !settings.useSimulator)}
                    style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                      cursor: 'pointer', border: 'none',
                      backgroundColor: settings.useSimulator ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                      color: settings.useSimulator ? 'var(--color-warning)' : '#22c55e',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {settings.useSimulator ? '🧪 Simulator ON' : '✅ Real Dispatch ON'}
                  </button>
                </div>
              </div>

              {/* Vercel Serverless environment warning */}
              {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') && (
                <div style={{
                  marginBottom: '20px', padding: '14px 18px', borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.82rem', color: 'var(--color-danger)', lineHeight: '1.5',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️</span> Vercel Cloud Serverless Limitation Detected
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Vercel serverless functions do not support running background Puppeteer web clients. 
                    <strong> Please keep "Simulator ON" active</strong> for instant simulated dispatches on Vercel demos.
                  </span>
                </div>
              )}

              {/* Main body: QR section or connected state */}
              {waStatus === 'ready' ? (
                /* Connected state */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                  padding: '32px', borderRadius: '12px',
                  backgroundColor: 'rgba(37,211,102,0.05)', border: '1px solid rgba(37,211,102,0.2)',
                }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    backgroundColor: 'rgba(37,211,102,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
                  }}>✅</div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#25D366' }}>WhatsApp Connected</p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Your phone is linked. Parent alerts will be sent via WhatsApp.
                    </p>
                  </div>
                  <button
                    onClick={handleWhatsAppDisconnect}
                    disabled={waDisconnecting}
                    style={{
                      padding: '8px 20px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.4)',
                      backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                      opacity: waDisconnecting ? 0.6 : 1,
                    }}
                  >
                    {waDisconnecting ? 'Disconnecting...' : '⛔ Disconnect Session'}
                  </button>
                </div>
              ) : waStatus === 'qr' && waQrUrl ? (
                /* QR scan state */
                <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '12px', borderRadius: '12px', backgroundColor: '#fff',
                      boxShadow: '0 0 30px rgba(37,211,102,0.2)',
                      border: '2px solid rgba(37,211,102,0.4)',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={waQrUrl} alt="WhatsApp QR Code" width={200} height={200} style={{ display: 'block', borderRadius: '6px' }} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      QR refreshes automatically
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Scan to Connect WhatsApp</h3>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '2', fontWeight: 500 }}>
                      <li>Open <strong>WhatsApp</strong> on your phone</li>
                      <li>Tap <strong>⋮ Menu</strong> → <strong>Linked Devices</strong></li>
                      <li>Tap <strong>Link a Device</strong></li>
                      <li>Point your camera at the QR code</li>
                    </ol>
                    <div style={{
                      padding: '10px 14px', borderRadius: '8px',
                      backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                      fontSize: '0.78rem', color: 'var(--color-warning)', lineHeight: '1.5',
                    }}>
                      ⚡ Session is saved after first scan — no re-scan needed on restart.
                    </div>
                  </div>
                </div>
              ) : (
                /* Initialising / disconnected state */
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                  padding: '40px', borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-dim)',
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: '2.5rem' }}>
                    {waStatus === 'initialising' ? '⏳' : '📵'}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                      {waStatus === 'initialising' ? 'Starting WhatsApp client...' : 'WhatsApp Not Connected'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {waStatus === 'initialising'
                        ? 'Please wait — booting up the Chromium session. A QR code will appear shortly.'
                        : 'The client is not running. Restart the dev server to generate a QR code.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Template Macro Preview */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-primary)' }}>✏️</span> Parent Alert Message Rules
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }} className="grid-responsive-settings">
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Available Dynamic Placeholder Tokens:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['{name}', '{roll}', '{class}', '{date}'].map((tag) => (
                        <span
                          key={tag}
                          onClick={() => handleInputChange('smsTemplate', settings.smsTemplate + ' ' + tag)}
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
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

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
                    }}
                  >
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
        ) : (activeTab === 'staff' && userRole === 'admin') ? (
          /* TAB 2: Staff directory (RBAC Admin actions) */
          <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                  Authorized Staff Accounts
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>
                  Manage institutional administrator profiles and classroom teacher accounts.
                </p>
              </div>

              <button
                onClick={() => {
                  setStaffError('');
                  setNewStaffModalOpen(true);
                }}
                className="btn-primary"
                style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
              >
                + Register Staff Account
              </button>
            </div>

            {loadingStaff ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="pulse-indicator" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '8px' }}></span>
                Loading staff registries...
              </div>
            ) : staffList.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No active staff entries registered.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-dim)' }}>
                      <th style={{ padding: '12px 8px', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Full Name</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Email Credentials</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Role</th>
                      <th style={{ padding: '12px 8px', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((st) => {
                      const isSelf = userEmail.toLowerCase() === st.email.toLowerCase();
                      return (
                        <tr key={st.email} style={{ borderBottom: '1px solid var(--border-dim)' }} className="table-row-hover">
                          <td style={{ padding: '14px 8px', fontSize: '0.88rem', fontWeight: 700 }}>
                            {st.name} {isSelf && <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.15)', color: 'var(--color-primary)', marginLeft: '6px' }}>You</span>}
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {st.email}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: st.role === 'admin' ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.15)',
                              color: st.role === 'admin' ? '#22c55e' : 'var(--color-accent)',
                              marginRight: '8px'
                            }}>
                              {st.role}
                            </span>
                            {st.role === 'teacher' && (
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 650,
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                color: 'var(--text-muted)',
                              }}>
                                Section: {classes.find(c => c.classId === st.classId)?.name || st.classId || 'Not Assigned'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => {
                                  setStaffToEdit(st);
                                  setEditStaffName(st.name);
                                  st.role && setEditStaffRole(st.role);
                                  setEditStaffClassId(st.classId || (classes[0]?.classId || ''));
                                  setEditStaffPassword('');
                                  setStaffError('');
                                  setEditStaffModalOpen(true);
                                }}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-dim)',
                                  backgroundColor: 'var(--background-alt)',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                className="quick-btn-hover"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setStaffToDelete(st);
                                  setDeleteStaffModalOpen(true);
                                }}
                                disabled={isSelf}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-dim)',
                                  backgroundColor: 'var(--background-alt)',
                                  color: 'var(--color-danger)',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: isSelf ? 'not-allowed' : 'pointer',
                                  opacity: isSelf ? 0.4 : 1,
                                }}
                                className={isSelf ? '' : 'quick-btn-hover'}
                                title={isSelf ? 'Self-deletion restricted' : 'Purge staff account'}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (activeTab === 'license' && userRole === 'admin') ? (
          /* TAB 3: Active School License */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* License Overview Roster */}
            <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: 'var(--color-primary)' }}>🔑</span> Active Institution License
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {/* Status Badging */}
                <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>License Status</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: settings.licenseStatus === 'Active' ? '#22c55e' : settings.licenseStatus === 'Trial' ? 'var(--color-warning)' : '#ef4444',
                      boxShadow: settings.licenseStatus === 'Active' ? '0 0 10px #22c55e' : settings.licenseStatus === 'Trial' ? '0 0 10px var(--color-warning)' : '0 0 10px #ef4444',
                      display: 'inline-block',
                    }} />
                    <span style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: settings.licenseStatus === 'Active' ? '#22c55e' : settings.licenseStatus === 'Trial' ? 'var(--color-warning)' : '#ef4444'
                    }}>
                      {settings.licenseStatus || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Expiry Card */}
                <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Expiration Date</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
                    {settings.licenseExpiry || '2027-12-31'}
                  </div>
                </div>

                {/* Classroom Limits Card */}
                <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Classroom Allocation Limit</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
                    {settings.licenseLimitClasses || 25} Sections
                  </div>
                </div>
              </div>

              {/* License Key Code block */}
              <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--background-alt)', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 650, textTransform: 'uppercase' }}>Authorized Activation Key</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 750, fontFamily: 'monospace', color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
                  {settings.licenseKey || 'AURA-ENT-ACTIVE-9999-XXXX-2026'}
                </span>
              </div>
            </div>

            {/* Super Admin Control Actions Card */}
            {(userRole as string) === 'superadmin' && (
              <div className="glass-panel" style={{ padding: '28px', border: '1px solid var(--border-dim)' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--color-primary)' }}>🛠️</span> Super Admin Licensing Control
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="grid-responsive-settings">
                  {/* Key Input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>License Activation Key</label>
                    <input
                      type="text"
                      value={settings.licenseKey || ''}
                      onChange={(e) => handleInputChange('licenseKey', e.target.value)}
                      placeholder="e.g. AURA-ENT-XXXX-YYYY"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'monospace' }}
                    />
                  </div>

                  {/* Status Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>Enforce License Status</label>
                    <select
                      value={settings.licenseStatus || 'Active'}
                      onChange={(e) => handleInputChange('licenseStatus', e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    >
                      <option value="Active">Active (Green Badge)</option>
                      <option value="Trial">Trial Mode (Orange Warning Badge)</option>
                      <option value="Expired">Expired (Locked Dashboard Warning)</option>
                      <option value="Suspended">Suspended (System Inactive Warning)</option>
                    </select>
                  </div>

                  {/* Expiry Selection */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>License Expiry Date</label>
                    <input
                      type="date"
                      value={settings.licenseExpiry || ''}
                      onChange={(e) => handleInputChange('licenseExpiry', e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>

                  {/* Class Allocation limit */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>Classroom Section Limits</label>
                    <input
                      type="number"
                      value={settings.licenseLimitClasses || 25}
                      onChange={(e) => handleInputChange('licenseLimitClasses', e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={handleSave}
                    disabled={isPending || loading}
                    className="btn-primary"
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: (isPending || loading) ? 'not-allowed' : 'pointer',
                      opacity: (isPending || loading) ? 0.65 : 1,
                    }}
                  >
                    {isPending ? 'Assigning License...' : 'Apply Super Admin License'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'security' ? (
          /* TAB 4: Security (Password Modification) */
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <div className="glass-panel" style={{ padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--color-primary)' }}>🔒</span> Change Password
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                  Update your account credentials to keep your portal secure.
                </p>
              </div>

              {passwordError && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
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
                      transition: 'border-color 0.2s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
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
                      transition: 'border-color 0.2s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password to confirm"
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
                      transition: 'border-color 0.2s ease',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    fontWeight: 650,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: passwordSubmitting ? 'not-allowed' : 'pointer',
                    opacity: passwordSubmitting ? 0.65 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    marginTop: '8px'
                  }}
                >
                  {passwordSubmitting ? (
                    <>
                      <span className="pulse-indicator" style={{ width: '14px', height: '14px' }}></span>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>🔑</span>
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : null}

        {/* MODAL 1: Register Staff */}
        {newStaffModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '28px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 850, letterSpacing: '-0.02em', margin: 0 }}>Register Staff User</h3>
                <button onClick={() => setNewStaffModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>×</button>
              </div>

              {staffError && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>
                  ⚠️ {staffError}
                </div>
              )}

              <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>STAFF NAME</label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Professor Smith"
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>EMAIL ID</label>
                  <input
                    type="email"
                    required
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="name@school.edu"
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>PASSWORD</label>
                  <input
                    type="password"
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Enter security password"
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>SYSTEM ROLE</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => {
                      const role = e.target.value as any;
                      setNewStaffRole(role);
                      if (role === 'teacher' && classes.length > 0 && !newStaffClassId) {
                        setNewStaffClassId(classes[0].classId);
                      }
                    }}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                  >
                    <option value="teacher">Classroom Teacher</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                {newStaffRole === 'teacher' && classes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>CLASSROOM SECTION ASSIGNMENT</label>
                    <select
                      value={newStaffClassId}
                      onChange={(e) => setNewStaffClassId(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                    >
                      {classes.map((c) => (
                        <option key={c.classId} value={c.classId}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={staffSaving}
                  className="btn-primary"
                  style={{ padding: '12px', borderRadius: '8px', fontWeight: 650, fontSize: '0.88rem', border: 'none', cursor: 'pointer', marginTop: '6px' }}
                >
                  {staffSaving ? 'Registering Account...' : 'Register Staff Member'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Edit Staff */}
        {editStaffModalOpen && staffToEdit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '28px', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 850, letterSpacing: '-0.02em', margin: 0 }}>Edit Staff Member</h3>
                <button onClick={() => setEditStaffModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>×</button>
              </div>

              {staffError && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>
                  ⚠️ {staffError}
                </div>
              )}

              <form onSubmit={handleEditStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>STAFF NAME</label>
                  <input
                    type="text"
                    required
                    value={editStaffName}
                    onChange={(e) => setEditStaffName(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>NEW PASSWORD (OPTIONAL)</label>
                  <input
                    type="password"
                    value={editStaffPassword}
                    onChange={(e) => setEditStaffPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>SYSTEM ROLE</label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => {
                      const role = e.target.value as any;
                      setEditStaffRole(role);
                      if (role === 'teacher' && classes.length > 0 && !editStaffClassId) {
                        setEditStaffClassId(classes[0].classId);
                      }
                    }}
                    disabled={userEmail.toLowerCase() === staffToEdit.email.toLowerCase()}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none', opacity: (userEmail.toLowerCase() === staffToEdit.email.toLowerCase()) ? 0.6 : 1 }}
                  >
                    <option value="teacher">Classroom Teacher</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                {editStaffRole === 'teacher' && classes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)' }}>CLASSROOM SECTION ASSIGNMENT</label>
                    <select
                      value={editStaffClassId}
                      onChange={(e) => setEditStaffClassId(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontSize: '0.86rem', outline: 'none' }}
                    >
                      {classes.map((c) => (
                        <option key={c.classId} value={c.classId}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={staffSaving}
                  className="btn-primary"
                  style={{ padding: '12px', borderRadius: '8px', fontWeight: 650, fontSize: '0.88rem', border: 'none', cursor: 'pointer', marginTop: '6px' }}
                >
                  {staffSaving ? 'Saving Changes...' : 'Save Profile details'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Delete Confirmation */}
        {deleteStaffModalOpen && staffToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-dim)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-danger)' }}>Purge Staff Account?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Are you absolutely sure you want to remove <strong>{staffToDelete.name}</strong> from the system staff login directory?
                <br /><br />
                This will instantly revoke all credentials and dashboard access sessions for <strong>{staffToDelete.email}</strong>.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setDeleteStaffModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStaff}
                  disabled={staffDeleting}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: 'var(--color-danger)', color: '#fff', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
                >
                  {staffDeleting ? 'Deleting...' : 'Confirm Purge'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .class-card-hover:hover {
          background-color: rgba(79, 70, 229, 0.04) !important;
          border-color: var(--color-primary) !important;
        }
        .table-row-hover:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .quick-btn-hover:hover {
          background-color: var(--color-primary) !important;
          color: #fff !important;
          border-color: var(--color-primary) !important;
          box-shadow: var(--shadow-glow) !important;
        }
        .btn-primary:hover {
          box-shadow: var(--shadow-glow) !important;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </DashboardLayout>
  );
}

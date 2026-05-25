'use client';

import React, { useState, useEffect, useTransition } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface Student {
  rollNumber: string;
  name: string;
  parentPhone: string;
}

interface ClassModel {
  classId: string;
  name: string;
}

interface LeaveRequest {
  id: string;
  rollNumber: string;
  studentName: string;
  classId: string;
  className: string;
  startDate: string;
  endDate: string;
  type: 'Medical' | 'Casual' | 'Family' | 'Emergency';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
}

export default function LeavesManagementPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentRoll, setSelectedStudentRoll] = useState('');
  
  const [userRole, setUserRole] = useState<'admin' | 'teacher'>('teacher');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState<'Medical' | 'Casual' | 'Family' | 'Emergency'>('Medical');
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Load User Details
        let uRole: 'admin' | 'teacher' = 'teacher';
        let uClassId = '';
        const resUser = await fetch('/api/auth/user');
        if (resUser.ok) {
          const userData = await resUser.json();
          uRole = (userData?.user?.role === 'admin' ? 'admin' : 'teacher');
          uClassId = userData?.user?.classId || '';
          setUserRole(uRole);
        }

        // 2. Load Classes
        const resClasses = await fetch('/api/classes');
        if (resClasses.ok) {
          const classesData = await resClasses.json();
          const filteredClasses = uRole === 'admin'
            ? classesData
            : classesData.filter((c: any) => c.classId === uClassId);
            
          setClasses(filteredClasses);
          if (filteredClasses.length > 0) {
            setSelectedClass(filteredClasses[0].classId);
          }
        }

        // 3. Load Leaves
        const resLeaves = await fetch('/api/leaves');
        if (resLeaves.ok) {
          const leavesData = await resLeaves.json() as LeaveRequest[];
          const filteredLeaves = uRole === 'admin'
            ? leavesData
            : leavesData.filter((l) => l.classId === uClassId);
          setLeaves(filteredLeaves);
        }
      } catch (err) {
        console.error('Failed to load leaves registry details:', err);
        showToast('Network error while pulling leaves lists.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync students dropdown on class change
  useEffect(() => {
    if (!selectedClass) return;
    async function fetchStudents() {
      try {
        const res = await fetch(`/api/students?classId=${selectedClass}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
          if (data.length > 0) {
            setSelectedStudentRoll(data[0].rollNumber);
          } else {
            setSelectedStudentRoll('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch class roster:', err);
      }
    }
    fetchStudents();
  }, [selectedClass]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedStudentRoll || !startDate || !endDate || !leaveReason.trim()) {
      showToast('All leave application fields are required.', 'error');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      showToast('End Date cannot be before Start Date.', 'error');
      return;
    }

    const targetStudent = students.find((s) => s.rollNumber === selectedStudentRoll);
    const targetClass = classes.find((c) => c.classId === selectedClass);
    
    if (!targetStudent || !targetClass) {
      showToast('Selected student or section is invalid.', 'error');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rollNumber: targetStudent.rollNumber,
            studentName: targetStudent.name,
            classId: targetClass.classId,
            className: targetClass.name,
            startDate,
            endDate,
            type: leaveType,
            reason: leaveReason,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setLeaves((prev) => [data.leave, ...prev]);
          showToast('Student leave request filed atomically!');
          // Reset form fields
          setStartDate('');
          setEndDate('');
          setLeaveReason('');
        } else {
          showToast('Failed to apply student leave.', 'error');
        }
      } catch (err) {
        console.error('Failed to submit leave:', err);
        showToast('Network error while filing leave.', 'error');
      }
    });
  };

  const handleProcessLeave = (id: string, status: 'Approved' | 'Rejected') => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/leaves', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status }),
        });

        if (res.ok) {
          const data = await res.json();
          setLeaves((prev) =>
            prev.map((l) => (l.id === id ? data.leave : l))
          );
          showToast(`Student leave application status marked: ${status}!`);
        } else {
          const err = await res.json();
          showToast(err?.error || 'Failed to update leave status.', 'error');
        }
      } catch (err) {
        console.error('Failed to update leave status:', err);
        showToast('Network error while processing leave.', 'error');
      }
    });
  };

  // Status summaries
  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const totalCount = leaves.length;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
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

        {/* Title area */}
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 850, letterSpacing: '-0.03em', margin: 0 }}>
            Leaves & Holidays
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
            File student leave profiles, view active applications, and execute role-based approvals atomically.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              📝
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Applications</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800 }}>{totalCount}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              ✓
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approved Leaves</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{approvedCount}</h3>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(234, 179, 8, 0.12)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              ⏱
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Review</span>
              <h3 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)' }}>{pendingCount}</h3>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <span className="pulse-indicator" style={{ width: '24px', height: '24px' }}></span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Loading Leaves Registry Database...
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px' }} className="grid-responsive-leaves">
            
            {/* Left Side: Submit Request */}
            <div className="glass-panel" style={{ padding: '24px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                File Student Leave
              </h2>

              <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Classroom */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Classroom Section
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    {classes.map((c) => (
                      <option key={c.classId} value={c.classId}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Student */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Student Target
                  </label>
                  {students.length > 0 ? (
                    <select
                      value={selectedStudentRoll}
                      onChange={(e) => setSelectedStudentRoll(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-dim)',
                        backgroundColor: 'var(--background-alt)',
                        color: 'var(--text-primary)',
                        fontSize: '0.86rem',
                        fontWeight: 500,
                        outline: 'none',
                      }}
                    >
                      {students.map((s) => (
                        <option key={s.rollNumber} value={s.rollNumber}>
                          {s.name} (Roll: {s.rollNumber})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
                      No active student records in section.
                    </div>
                  )}
                </div>

                {/* Leave type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Leave Category
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  >
                    <option value="Medical">Medical Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Family">Family Reason</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                {/* Date range grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-dim)',
                        backgroundColor: 'var(--background-alt)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-dim)',
                        backgroundColor: 'var(--background-alt)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Reason description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>
                    Detailed Reason / remarks
                  </label>
                  <textarea
                    rows={3}
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Enter reason e.g. High fever, out-of-town wedding..."
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-dim)',
                      backgroundColor: 'var(--background-alt)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || students.length === 0}
                  className="btn-primary"
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 650,
                    fontSize: '0.88rem',
                    cursor: (isPending || students.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (isPending || students.length === 0) ? 0.6 : 1,
                  }}
                >
                  {isPending ? 'Filing Application...' : 'File Student Leave'}
                </button>
              </form>
            </div>

            {/* Right Side: Roster logs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, borderBottom: '1px solid var(--border-dim)', paddingBottom: '12px' }}>
                Leave Requests Index & Review logs
              </h2>

              {leaves.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                  🍃 No student leave records filed yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-dim)' }}>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Student</th>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Section</th>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Dates</th>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Category</th>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Reason</th>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '12px 8px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '14px 8px' }}>
                            <div style={{ fontWeight: 650, fontSize: '0.86rem' }}>{l.studentName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Roll: {l.rollNumber}</div>
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '0.82rem', fontWeight: 500 }}>
                            {l.className}
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {l.startDate} <span style={{ fontSize: '0.72rem' }}>to</span> {l.endDate}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--border-dim)',
                              color: 'var(--text-primary)',
                            }}>
                              {l.type}
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: '0.8rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.reason}>
                            {l.reason}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              boxShadow: l.status === 'Pending' ? '0 0 10px rgba(234,179,8,0.1)' : l.status === 'Approved' ? '0 0 10px rgba(34,197,94,0.1)' : 'none',
                              backgroundColor: l.status === 'Pending' ? 'rgba(234,179,8,0.15)' : l.status === 'Approved' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: l.status === 'Pending' ? 'var(--color-warning)' : l.status === 'Approved' ? '#22c55e' : '#ef4444',
                            }}>
                              {l.status}
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            {l.status === 'Pending' ? (
                              userRole === 'admin' ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleProcessLeave(l.id, 'Approved')}
                                    disabled={isPending}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      backgroundColor: '#22c55e',
                                      color: '#fff',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleProcessLeave(l.id, 'Rejected')}
                                    disabled={isPending}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: 'none',
                                      backgroundColor: '#ef4444',
                                      color: '#fff',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 500 }}>
                                  Requires Admin Approval
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                Processed
                              </span>
                            )}
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
      </div>

      <style jsx global>{`
        .grid-responsive-leaves {
          display: grid;
          grid-template-columns: 1fr 2.5fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .grid-responsive-leaves {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

interface Classroom {
  classId: string;
  name: string;
}

interface Student {
  rollNumber: string;
  name: string;
  parentPhone: string;
  classId: string;
}

interface StudentStatus {
  rollNumber: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  remarks: string;
}

export default function AttendanceMarkingPage() {
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(initialClassId);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, StudentStatus>>({});
  
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Set default date to today in YYYY-MM-DD format
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Fetch classes on load
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
          
          // Auto-select first class if none in query param
          if (!initialClassId && data.length > 0) {
            setSelectedClass(data[0].classId);
          }
        }
      } catch (err) {
        console.error('Failed to load classrooms:', err);
      }
    }
    loadClasses();
  }, [initialClassId]);

  // Load students and saved attendance whenever classroom or date picker changes
  useEffect(() => {
    if (!selectedClass || !selectedDate) return;

    async function loadRosterAndHistory() {
      try {
        setLoading(true);
        
        // 1. Fetch classroom students directory
        const resStudents = await fetch(`/api/students?classId=${selectedClass}`);
        let studentsList: Student[] = [];
        if (resStudents.ok) {
          studentsList = await resStudents.json();
          setStudents(studentsList);
        }

        // 2. Fetch existing daily marking history
        const resAttendance = await fetch(`/api/attendance?classId=${selectedClass}&date=${selectedDate}`);
        let savedRecords: any[] = [];
        if (resAttendance.ok) {
          savedRecords = await resAttendance.json();
        }

        // 3. Build state mapping. For each student, use saved status if exists, otherwise default to 'Present'
        const initialAttendanceState: Record<string, StudentStatus> = {};
        studentsList.forEach((stud) => {
          const saved = savedRecords.find((rec) => rec.rollNumber === stud.rollNumber);
          initialAttendanceState[stud.rollNumber] = {
            rollNumber: stud.rollNumber,
            status: saved ? saved.status : 'Present', // Default is Present
            remarks: saved ? saved.remarks : '',
          };
        });
        
        setAttendance(initialAttendanceState);
      } catch (err) {
        console.error('Failed to load roster records:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRosterAndHistory();
  }, [selectedClass, selectedDate]);

  // Trigger floating feedback toaster
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleStatusChange = (rollNumber: string, status: 'Present' | 'Absent' | 'Late' | 'Leave') => {
    setAttendance((prev) => ({
      ...prev,
      [rollNumber]: {
        ...prev[rollNumber],
        status,
      },
    }));
  };

  const handleRemarksChange = (rollNumber: string, remarks: string) => {
    setAttendance((prev) => ({
      ...prev,
      [rollNumber]: {
        ...prev[rollNumber],
        remarks,
      },
    }));
  };

  // Mark full classroom roster as Present (instant productivity booster!)
  const markAllPresent = () => {
    setAttendance((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        newState[key].status = 'Present';
      });
      return newState;
    });
    showToast('All student records set to Present');
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const recordsPayload = Object.values(attendance);
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedClass,
            date: selectedDate,
            records: recordsPayload,
          }),
        });

        if (res.ok) {
          showToast('Attendance worksheet saved atomically!');
        } else {
          showToast('Failed to save attendance records.', 'error');
        }
      } catch (err) {
        console.error('Failed to post daily attendance:', err);
        showToast('Network error while saving.', 'error');
      }
    });
  };

  // Real-time dynamic count summaries
  const getStats = () => {
    const vals = Object.values(attendance);
    const present = vals.filter((v) => v.status === 'Present').length;
    const absent = vals.filter((v) => v.status === 'Absent').length;
    const late = vals.filter((v) => v.status === 'Late').length;
    const leave = vals.filter((v) => v.status === 'Leave').length;
    return { present, absent, late, leave, total: vals.length };
  };

  const stats = getStats();

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              zIndex: 50,
              padding: '16px 24px',
              borderRadius: '10px',
              backgroundColor: toastMessage.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff',
              fontWeight: 600,
              boxShadow: 'var(--shadow-lg)',
              animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {toastMessage.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {toastMessage.text}
          </div>
        )}

        {/* Page Title & Back link */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Daily Attendance Sheet
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              Verify student statuses and click save to commit changes atomically.
            </p>
          </div>
          <button
            onClick={markAllPresent}
            disabled={loading || students.length === 0}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--border-dim)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
            className="secondary-btn-hover"
          >
            Mark All Present
          </button>
        </div>

        {/* Filters Header Container */}
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', flex: 1 }}>
            {/* Classroom Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Select Classroom Channel
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-dim)',
                  backgroundColor: 'var(--background-default)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {classes.map((cls) => (
                  <option key={cls.classId} value={cls.classId}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Roster Calendar Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-dim)',
                  backgroundColor: 'var(--background-default)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          {/* Roster stats mini counters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.08)', color: 'var(--color-success)', fontWeight: 600 }}>
              Present: {stats.present}
            </span>
            <span style={{ fontSize: '0.78rem', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', fontWeight: 600 }}>
              Absent: {stats.absent}
            </span>
            <span style={{ fontSize: '0.78rem', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-warning)', fontWeight: 600 }}>
              Late: {stats.late}
            </span>
            <span style={{ fontSize: '0.78rem', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'rgba(6, 182, 212, 0.08)', color: 'var(--color-info)', fontWeight: 600 }}>
              Leave: {stats.leave}
            </span>
          </div>
        </div>

        {/* Student Roster Table Sheet */}
        <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
              Retrieving roster database records...
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No student accounts linked to this classroom.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Roll No</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Student Name</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Attendance Status</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Remarks / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const record = attendance[student.rollNumber] || { status: 'Present', remarks: '' };
                    return (
                      <tr
                        key={student.rollNumber}
                        style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background-color 0.2s ease' }}
                        className="table-row-hover"
                      >
                        {/* Roll Number */}
                        <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {student.rollNumber}
                        </td>
                        
                        {/* Full Name */}
                        <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {student.name}
                        </td>
                        
                        {/* Interactive Status Selector Group */}
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Present Selector Button */}
                            <button
                              onClick={() => handleStatusChange(student.rollNumber, 'Present')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid transparent',
                                transition: 'var(--transition-fast)',
                                backgroundColor: record.status === 'Present' ? 'var(--color-success)' : 'var(--background-alt)',
                                color: record.status === 'Present' ? '#fff' : 'var(--text-secondary)',
                              }}
                            >
                              Present
                            </button>

                            {/* Absent Selector Button */}
                            <button
                              onClick={() => handleStatusChange(student.rollNumber, 'Absent')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid transparent',
                                transition: 'var(--transition-fast)',
                                backgroundColor: record.status === 'Absent' ? 'var(--color-danger)' : 'var(--background-alt)',
                                color: record.status === 'Absent' ? '#fff' : 'var(--text-secondary)',
                              }}
                            >
                              Absent
                            </button>

                            {/* Late Selector Button */}
                            <button
                              onClick={() => handleStatusChange(student.rollNumber, 'Late')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid transparent',
                                transition: 'var(--transition-fast)',
                                backgroundColor: record.status === 'Late' ? 'var(--color-warning)' : 'var(--background-alt)',
                                color: record.status === 'Late' ? '#fff' : 'var(--text-secondary)',
                              }}
                            >
                              Late
                            </button>

                            {/* Leave Selector Button */}
                            <button
                              onClick={() => handleStatusChange(student.rollNumber, 'Leave')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid transparent',
                                transition: 'var(--transition-fast)',
                                backgroundColor: record.status === 'Leave' ? 'var(--color-info)' : 'var(--background-alt)',
                                color: record.status === 'Leave' ? '#fff' : 'var(--text-secondary)',
                              }}
                            >
                              Leave
                            </button>
                          </div>
                        </td>
                        
                        {/* Remarks Input */}
                        <td style={{ padding: '16px 24px' }}>
                          <input
                            type="text"
                            value={record.remarks}
                            onChange={(e) => handleRemarksChange(student.rollNumber, e.target.value)}
                            placeholder="Add remarks (e.g. Sick, Late transit)"
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-dim)',
                              backgroundColor: 'var(--background-default)',
                              fontSize: '0.85rem',
                              outline: 'none',
                            }}
                            className="remarks-input"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button
            onClick={handleSave}
            disabled={loading || isPending || students.length === 0}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              border: 'none',
              transition: 'var(--transition-smooth)',
              boxShadow: 'var(--shadow-glow)',
              opacity: loading || isPending ? 0.7 : 1,
            }}
            className="save-btn-hover"
          >
            {isPending ? 'Saving atomic changes...' : 'Save Roster Attendance'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .table-row-hover:hover {
          background-color: var(--background-alt) !important;
        }
        .secondary-btn-hover:hover {
          border-color: var(--text-primary) !important;
          color: var(--text-primary) !important;
        }
        .remarks-input:focus {
          border-color: var(--color-primary) !important;
        }
        .save-btn-hover:hover {
          background-color: var(--color-primary-hover) !important;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </DashboardLayout>
  );
}

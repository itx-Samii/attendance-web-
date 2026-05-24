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

  // Phase 3 States: Review Modal, customizable templates, and absentees
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [alertTemplate, setAlertTemplate] = useState(
    'Dear Parent, your child {student_name} (Roll: {roll_number}) was marked ABSENT from {class_name} today ({date}). Please contact the administration.'
  );
  const [absenteesList, setAbsenteesList] = useState<Student[]>([]);

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

  // Trigger save button flow (D-01)
  const handleSaveTrigger = () => {
    // 1. Identify absentees to see if notifications modal review is required
    const currentAbsentees = students.filter(
      (stud) => attendance[stud.rollNumber]?.status === 'Absent'
    );

    if (currentAbsentees.length > 0) {
      setAbsenteesList(currentAbsentees);
      setShowPreviewModal(true); // Open Phase 3 customized review modal (D-01)
    } else {
      // Direct commit if no absentees exist
      executeAttendanceCommit([]);
    }
  };

  // Commit actual attendance data and dispatch notification logs
  const executeAttendanceCommit = (alertDispatches: Array<{ rollNumber: string; studentName: string; parentPhone: string; message: string }>) => {
    startTransition(async () => {
      try {
        const recordsPayload = Object.values(attendance);
        
        // 1. Save daily roster records
        const resAttendance = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedClass,
            date: selectedDate,
            records: recordsPayload,
          }),
        });

        if (!resAttendance.ok) {
          showToast('Failed to save attendance records.', 'error');
          return;
        }

        // 2. Dispatch notifications if any absentees were processed (D-02)
        if (alertDispatches.length > 0) {
          const resNotifications = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classId: selectedClass,
              date: selectedDate,
              dispatches: alertDispatches,
            }),
          });

          if (resNotifications.ok) {
            const data = await resNotifications.json();
            const sentCount = alertDispatches.length;
            const modeLabel = data.mode === 'Simulator' ? 'Simulated' : 'Sent';
            showToast(`Roster saved and ${sentCount} ${modeLabel} parent alerts logged!`);
          } else {
            showToast('Attendance saved, but failed to log notifications.', 'error');
          }
        } else {
          showToast('Attendance worksheet saved atomically!');
        }

        setShowPreviewModal(false);
      } catch (err) {
        console.error('Failed to commit attendance details:', err);
        showToast('Network error while saving.', 'error');
      }
    });
  };

  // Dynamic interpolation helper mapping template tags (D-05)
  const getInterpolatedAlertText = (studentName: string, rollNumber: string) => {
    const className = classes.find((c) => c.classId === selectedClass)?.name || selectedClass;
    return alertTemplate
      .replace(/{student_name}/gi, studentName)
      .replace(/{roll_number}/gi, rollNumber)
      .replace(/{class_name}/gi, className)
      .replace(/{date}/gi, selectedDate);
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
              zIndex: 150,
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
            onClick={handleSaveTrigger}
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
            {isPending ? 'Processing dispatches...' : 'Save Roster Attendance'}
          </button>
        </div>
      </div>

      {/* Phase 3: Twilio SMS Alerts Confirmation & Review Preview Modal (D-01) */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '24px',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              border: '1px solid var(--border-dim)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Modal Headings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Review Parent SMS Alerts
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    color: 'var(--color-danger)',
                  }}
                >
                  {absenteesList.length} Absentees Detected
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
                Adjust parent notification template dynamically prior to triggering API dispatches.
              </p>
            </div>

            {/* Base SMS Alert Template Customizer (D-05) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Base Message Template Text
              </label>
              <textarea
                value={alertTemplate}
                onChange={(e) => setAlertTemplate(e.target.value)}
                placeholder="Compose customizable base phrasing..."
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-dim)',
                  backgroundColor: 'var(--background-default)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  outline: 'none',
                  resize: 'none',
                  lineHeight: '1.4',
                }}
                className="remarks-input"
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Dynamic Tags:</span>
                <code style={{ padding: '2px 4px', backgroundColor: 'var(--background-alt)', borderRadius: '4px' }}>{"{student_name}"}</code>
                <code style={{ padding: '2px 4px', backgroundColor: 'var(--background-alt)', borderRadius: '4px' }}>{"{roll_number}"}</code>
                <code style={{ padding: '2px 4px', backgroundColor: 'var(--background-alt)', borderRadius: '4px' }}>{"{class_name}"}</code>
                <code style={{ padding: '2px 4px', backgroundColor: 'var(--background-alt)', borderRadius: '4px' }}>{"{date}"}</code>
              </div>
            </div>

            {/* List of Draft Messages to Parents */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Recipient Preview Cards
              </label>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {absenteesList.map((stud) => {
                  const smsBody = getInterpolatedAlertText(stud.name, stud.rollNumber);
                  return (
                    <div
                      key={stud.rollNumber}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-dim)',
                        backgroundColor: 'var(--background-alt)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {stud.name} ({stud.rollNumber})
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          📱 Parent: {stud.parentPhone}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0, fontStyle: 'italic' }}>
                        "{smsBody}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Action Buttons Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-dim)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
                className="secondary-btn-hover"
              >
                Cancel review
              </button>
              
              <button
                onClick={() => {
                  // Compile individual personalized alert dispatches for payload (D-02)
                  const dispatches = absenteesList.map((stud) => ({
                    rollNumber: stud.rollNumber,
                    studentName: stud.name,
                    parentPhone: stud.parentPhone,
                    message: getInterpolatedAlertText(stud.name, stud.rollNumber),
                  }));
                  executeAttendanceCommit(dispatches);
                }}
                disabled={isPending}
                style={{
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow)',
                  transition: 'var(--transition-fast)',
                }}
                className="save-btn-hover"
              >
                {isPending ? 'Sending dispatches...' : 'Dispatch Parent Alerts'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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

'use client';

import React, { useState, useEffect, useTransition } from 'react';
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

interface DailyAttendance {
  classId: string;
  date: string;
  records: {
    rollNumber: string;
    status: 'Present' | 'Absent' | 'Late' | 'Leave';
    remarks?: string;
  }[];
}

export default function RosterAndLedgerPage() {
  const [activeTab, setActiveTab] = useState<'roster' | 'ledger'>('roster');
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Search/Filter states
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Attendance Ledger states
  const [ledgerAttendance, setLedgerAttendance] = useState<DailyAttendance[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Edit Class Modal state
  const [editClassModalOpen, setEditClassModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<Classroom | null>(null);
  const [editClassNameVal, setEditClassNameVal] = useState('');
  const [classSaving, setClassSaving] = useState(false);
  const [classEditError, setClassEditError] = useState('');

  // Delete Class Confirmation state
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Classroom | null>(null);
  const [classDeleting, setClassDeleting] = useState(false);

  // Edit Student Modal state
  const [editStudentModalOpen, setEditStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [editStudentNameVal, setEditStudentNameVal] = useState('');
  const [editStudentPhoneVal, setEditStudentPhoneVal] = useState('');
  const [editStudentClassIdVal, setEditStudentClassIdVal] = useState('');
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentEditError, setStudentEditError] = useState('');

  // Delete Student Confirmation state
  const [deleteStudentModalOpen, setDeleteStudentModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentDeleting, setStudentDeleting] = useState(false);

  // Load Classes & Initial Students
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const resClasses = await fetch('/api/classes');
      const dataClasses = await resClasses.json();
      setClasses(dataClasses);

      if (dataClasses.length > 0) {
        // Automatically select the first class if none selected yet
        const defaultClassId = selectedClassId || dataClasses[0].classId;
        setSelectedClassId(defaultClassId);
        await loadStudents(defaultClassId);
        if (activeTab === 'ledger') {
          await loadLedger(defaultClassId);
        }
      }
    } catch (err) {
      console.error('Failed to load initial directory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classId: string) => {
    if (!classId) return;
    try {
      const res = await fetch(`/api/students?classId=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const loadLedger = async (classId: string) => {
    if (!classId) return;
    try {
      const res = await fetch(`/api/attendance?classId=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerAttendance(data);
      }
    } catch (err) {
      console.error('Failed to load attendance logs:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
      if (activeTab === 'ledger') {
        loadLedger(selectedClassId);
      }
    }
  }, [selectedClassId, activeTab]);

  // CRUD Handlers for Classes
  const handleOpenEditClass = (cls: Classroom) => {
    setClassToEdit(cls);
    setEditClassNameVal(cls.name);
    setClassEditError('');
    setEditClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classToEdit || !editClassNameVal.trim()) return;

    try {
      setClassSaving(true);
      setClassEditError('');
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classToEdit.classId,
          name: editClassNameVal.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditClassModalOpen(false);
        await loadInitialData();
      } else {
        setClassEditError(data.error || 'Failed to update classroom.');
      }
    } catch (err) {
      setClassEditError('An unexpected error occurred.');
    } finally {
      setClassSaving(false);
    }
  };

  const handleOpenDeleteClass = (cls: Classroom) => {
    setClassToDelete(cls);
    setDeleteClassModalOpen(true);
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setClassDeleting(true);
      const res = await fetch(`/api/classes?classId=${classToDelete.classId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteClassModalOpen(false);
        // Switch selectedClassId if we deleted the currently active one
        if (selectedClassId === classToDelete.classId) {
          setSelectedClassId('');
        }
        await loadInitialData();
      }
    } catch (err) {
      console.error('Failed to delete classroom:', err);
    } finally {
      setClassDeleting(false);
    }
  };

  // CRUD Handlers for Students
  const handleOpenEditStudent = (stud: Student) => {
    setStudentToEdit(stud);
    setEditStudentNameVal(stud.name);
    setEditStudentPhoneVal(stud.parentPhone);
    setEditStudentClassIdVal(stud.classId);
    setStudentEditError('');
    setEditStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToEdit || !editStudentNameVal.trim() || !editStudentPhoneVal.trim()) return;

    try {
      setStudentSaving(true);
      setStudentEditError('');
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: studentToEdit.rollNumber,
          name: editStudentNameVal.trim(),
          parentPhone: editStudentPhoneVal.trim(),
          classId: editStudentClassIdVal,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditStudentModalOpen(false);
        if (editStudentClassIdVal !== selectedClassId) {
          // If moved to a different class section, refresh lists
          await loadStudents(selectedClassId);
        } else {
          await loadStudents(selectedClassId);
        }
      } else {
        setStudentEditError(data.error || 'Failed to update student profile.');
      }
    } catch (err) {
      setStudentEditError('An unexpected error occurred.');
    } finally {
      setStudentSaving(false);
    }
  };

  const handleOpenDeleteStudent = (stud: Student) => {
    setStudentToDelete(stud);
    setDeleteStudentModalOpen(true);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setStudentDeleting(true);
      const res = await fetch(`/api/students?rollNumber=${studentToDelete.rollNumber}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteStudentModalOpen(false);
        await loadStudents(selectedClassId);
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
    } finally {
      setStudentDeleting(false);
    }
  };

  // Helper: Month days listing
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter students based on search string
  const filteredStudents = students.filter((s) => {
    const search = studentSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(search) || s.rollNumber.toLowerCase().includes(search);
  });

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              Roster & Monthly Ledger
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 500 }}>
              Audit educational rosters and view longitudinal monthly attendance calendars.
            </p>
          </div>

          {/* Elegant Sliding Tab Controller */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--background-alt)',
              borderRadius: '10px',
              padding: '4px',
              border: '1px solid var(--border-dim)',
            }}
          >
            <button
              onClick={() => setActiveTab('roster')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'roster' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'roster' ? '#fff' : 'var(--text-muted)',
                transition: 'var(--transition-smooth)',
              }}
            >
              Roster Directory
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'ledger' ? 'var(--color-primary)' : 'transparent',
                color: activeTab === 'ledger' ? '#fff' : 'var(--text-muted)',
                transition: 'var(--transition-smooth)',
              }}
            >
              Attendance Ledger
            </button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="glass-panel" style={{ padding: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Loading classroom logs...
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>
            {/* Sidebar: Class List */}
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-dim)' }}>
              <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Classroom Sections
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {classes.map((cls) => {
                  const isActive = selectedClassId === cls.classId;
                  return (
                    <div
                      key={cls.classId}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isActive ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--border-dim)'}`,
                        transition: 'var(--transition-smooth)',
                      }}
                      onClick={() => setSelectedClassId(cls.classId)}
                      className="class-card-hover"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                          {cls.name}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          Code: {cls.classId.toUpperCase()}
                        </span>
                      </div>

                      {/* Small Quick Action Buttons on hover/active */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClass(cls);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Edit Class Section"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteClass(cls);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-danger)',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete Classroom"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Area: Roster Directory or Attendance Ledger */}
            <div>
              {activeTab === 'roster' ? (
                /* Tab 1: Roster Directory Table */
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border-dim)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                        Student Directory Roster
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>
                        Manage student names, roll numbers, phone contacts, and classrooms.
                      </p>
                    </div>

                    {/* Quick Search */}
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-dim)',
                        backgroundColor: 'var(--background-alt)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                        fontWeight: 500,
                        outline: 'none',
                        width: '200px',
                      }}
                    />
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        No students enrolled in this section.
                      </span>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                            <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Roll Number</th>
                            <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</th>
                            <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parent Contact</th>
                            <th style={{ padding: '12px 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((stud) => (
                            <tr key={stud.rollNumber} style={{ borderBottom: '1px solid var(--border-dim)' }} className="table-row-hover">
                              <td style={{ padding: '14px 8px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {stud.rollNumber.toUpperCase()}
                              </td>
                              <td style={{ padding: '14px 8px', fontSize: '0.88rem', fontWeight: 500 }}>
                                {stud.name}
                              </td>
                              <td style={{ padding: '14px 8px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {stud.parentPhone}
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleOpenEditStudent(stud)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-dim)',
                                      backgroundColor: 'var(--background-alt)',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'var(--transition-smooth)',
                                    }}
                                    className="quick-btn-hover"
                                  >
                                    Edit Details
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteStudent(stud)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-dim)',
                                      backgroundColor: 'var(--background-alt)',
                                      color: 'var(--color-danger)',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'var(--transition-smooth)',
                                    }}
                                    className="quick-btn-hover"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Attendance Ledger Calendar Matrix */
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border-dim)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                        Monthly Attendance Ledger
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>
                        Aggregated calendars plotting student attendance codes daily.
                      </p>
                    </div>

                    {/* Month/Year selectors */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-dim)',
                          backgroundColor: 'var(--background-alt)',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          outline: 'none',
                          cursor: 'pointer',
                          minWidth: '120px',
                        }}
                      >
                        {months.map((m, idx) => (
                          <option key={m} value={idx} style={{ backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)' }}>
                            {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-dim)',
                          backgroundColor: 'var(--background-alt)',
                          color: 'var(--text-primary)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          outline: 'none',
                          cursor: 'pointer',
                          minWidth: '90px',
                        }}
                      >
                        <option value={2026} style={{ backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)' }}>2026</option>
                        <option value={2027} style={{ backgroundColor: 'var(--background-alt)', color: 'var(--text-primary)' }}>2027</option>
                      </select>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div style={{ padding: '48px 0', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Please enroll students in this section to view the ledger.
                      </span>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-dim)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)' }}>
                            <th style={{ padding: '12px 14px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', minWidth: '150px', position: 'sticky', left: 0, backgroundColor: 'var(--background-alt)', zIndex: 1 }}>
                              Student Name
                            </th>
                            {daysArray.map((day) => (
                              <th key={day} style={{ padding: '8px', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', minWidth: '32px' }}>
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((stud) => (
                            <tr key={stud.rollNumber} style={{ borderBottom: '1px solid var(--border-dim)' }} className="table-row-hover">
                              <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', position: 'sticky', left: 0, backgroundColor: 'var(--background-main)', zIndex: 1, boxShadow: '2px 0 5px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span>{stud.name}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stud.rollNumber.toUpperCase()}</span>
                                </div>
                              </td>

                              {daysArray.map((day) => {
                                // Find attendance code for this day
                                const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dailyRecord = ledgerAttendance.find((rec) => rec.date === dateString);
                                const record = dailyRecord?.records.find((r) => r.rollNumber.toLowerCase() === stud.rollNumber.toLowerCase());
                                const status = record?.status;

                                let badgeColor = 'rgba(255,255,255,0.05)';
                                let textColor = 'transparent';
                                let char = '';

                                if (status === 'Present') {
                                  badgeColor = 'rgba(16, 185, 129, 0.12)';
                                  textColor = 'var(--color-success)';
                                  char = 'P';
                                } else if (status === 'Absent') {
                                  badgeColor = 'rgba(239, 68, 68, 0.12)';
                                  textColor = 'var(--color-danger)';
                                  char = 'A';
                                } else if (status === 'Late') {
                                  badgeColor = 'rgba(245, 158, 11, 0.12)';
                                  textColor = 'var(--color-warning)';
                                  char = 'L';
                                } else if (status === 'Leave') {
                                  badgeColor = 'rgba(139, 92, 246, 0.12)';
                                  textColor = 'var(--color-accent)';
                                  char = 'E';
                                }

                                return (
                                  <td key={day} style={{ padding: '8px', textAlign: 'center' }}>
                                    <div
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: badgeColor,
                                        color: textColor,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        border: status ? 'none' : '1px dashed var(--border-dim)',
                                      }}
                                    >
                                      {char}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: Edit Classroom Section Name */}
        {editClassModalOpen && classToEdit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Edit Section Profile</h3>
                <button
                  onClick={() => setEditClassModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveClass} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {classEditError && <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>{classEditError}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>SECTION CODE</label>
                  <input
                    type="text"
                    value={classToEdit.classId.toUpperCase()}
                    disabled
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--background-alt)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-muted)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>CLASS NAME</label>
                  <input
                    type="text"
                    value={editClassNameVal}
                    onChange={(e) => setEditClassNameVal(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--background-alt)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={classSaving}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                  }}
                  className="quick-btn-hover"
                >
                  {classSaving ? 'Saving changes...' : 'Save Profile'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Delete Classroom Section (Cascading) */}
        {deleteClassModalOpen && classToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-dim)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-danger)' }}>Delete Classroom Section?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Are you absolutely sure you want to delete <strong>{classToDelete.name} ({classToDelete.classId.toUpperCase()})</strong>? 
                <br /><br />
                <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>WARNING:</span> This action is permanent and will cascade-delete all student roster details and enrolled directories belonging to this section!
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setDeleteClassModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-dim)',
                    backgroundColor: 'var(--background-alt)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteClass}
                  disabled={classDeleting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-danger)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {classDeleting ? 'Deleting...' : 'Delete Roster'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Edit Student Details */}
        {editStudentModalOpen && studentToEdit && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Edit Student Profile</h3>
                <button
                  onClick={() => setEditStudentModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {studentEditError && <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>{studentEditError}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>ROLL NUMBER</label>
                    <input
                      type="text"
                      value={studentToEdit.rollNumber.toUpperCase()}
                      disabled
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--background-alt)',
                        border: '1px solid var(--border-dim)',
                        color: 'var(--text-muted)',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>CLASS SECTION</label>
                    <select
                      value={editStudentClassIdVal}
                      onChange={(e) => setEditStudentClassIdVal(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--background-alt)',
                        border: '1px solid var(--border-dim)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {classes.map((c) => (
                        <option key={c.classId} value={c.classId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>STUDENT FULL NAME</label>
                  <input
                    type="text"
                    value={editStudentNameVal}
                    onChange={(e) => setEditStudentNameVal(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--background-alt)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>PARENT MOBILE (E.164)</label>
                  <input
                    type="tel"
                    value={editStudentPhoneVal}
                    onChange={(e) => setEditStudentPhoneVal(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--background-alt)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={studentSaving}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)',
                  }}
                  className="quick-btn-hover"
                >
                  {studentSaving ? 'Saving changes...' : 'Save Profile'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: Delete Student Confirmation */}
        {deleteStudentModalOpen && studentToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-dim)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--color-danger)' }}>Delete Student Profile?</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Are you absolutely sure you want to remove <strong>{studentToDelete.name} ({studentToDelete.rollNumber.toUpperCase()})</strong> from the enrolled registry? 
                <br /><br />
                This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setDeleteStudentModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-dim)',
                    backgroundColor: 'var(--background-alt)',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteStudent}
                  disabled={studentDeleting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-danger)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {studentDeleting ? 'Deleting...' : 'Delete Profile'}
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
      `}</style>
    </DashboardLayout>
  );
}

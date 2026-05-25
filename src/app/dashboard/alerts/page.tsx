'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface NotificationLog {
  classId: string;
  date: string;
  rollNumber: string;
  studentName: string;
  parentPhone: string;
  message: string;
  status: 'Sent' | 'Simulator' | 'Failed';
  sid: string;
  timestamp: string;
}

export default function AlertsAuditorPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to load parent alert logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // Live client-side filters (Search by name, roll number, phone or text content)
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.studentName.toLowerCase().includes(query) ||
      log.rollNumber.toLowerCase().includes(query) ||
      log.parentPhone.includes(query) ||
      log.message.toLowerCase().includes(query)
    );
  });

  // Calculate live statistics summaries
  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === 'Sent').length,
    simulator: logs.filter((l) => l.status === 'Simulator').length,
    failed: logs.filter((l) => l.status === 'Failed').length,
  };

  // Helper to format timestamps cleanly
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Parent Alerts Auditor Log
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            Real-time auditing trail of WhatsApp dispatches and sandbox simulator records.
          </p>
        </div>

        {/* Dynamic Metric Cards Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card: Total Logged */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Logs
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.total}
            </span>
          </div>

          {/* Card: Sent via SDK */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Sent via WhatsApp API
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {stats.sent}
            </span>
          </div>

          {/* Card: Simulated */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Simulated Sandbox
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-info)' }}>
              {stats.simulator}
            </span>
          </div>

          {/* Card: Failed */}
          <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Delivery Failures
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-danger)' }}>
              {stats.failed}
            </span>
          </div>
        </div>

        {/* Filtering Box Panel */}
        <div className="glass-panel" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, parent contact, SID, or WhatsApp message content..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '8px',
                border: '1px solid var(--border-dim)',
                backgroundColor: 'var(--background-default)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.85rem',
                outline: 'none',
              }}
              className="search-input"
            />
          </div>
        </div>

        {/* Auditable Data Table Panel */}
        <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
              Retrieving live parent alert logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {logs.length === 0 ? 'No parent alert dispatches logged yet.' : 'No logs match your current search query.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dim)', backgroundColor: 'var(--background-alt)' }}>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Student Roster</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Parent Contact</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Alert Message Body</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, index) => (
                    <tr
                      key={log.sid + index}
                      style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background-color 0.2s ease' }}
                      className="table-row-hover"
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {formatTimestamp(log.timestamp)}
                      </td>

                      {/* Student Name & Roll */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {log.studentName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            Roll: {log.rollNumber}
                          </span>
                        </div>
                      </td>

                      {/* Parent Phone Contact */}
                      <td style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {log.parentPhone}
                      </td>

                      {/* Message Preview */}
                      <td style={{ padding: '16px 24px', fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: '1.4' }}>
                        <div style={{ wordBreak: 'break-word', maxWidth: '300px' }}>
                          "{log.message}"
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontWeight: 500 }}>
                          SID: {log.sid}
                        </span>
                      </td>

                      {/* Delivery Status Badge */}
                      <td style={{ padding: '16px 24px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            backgroundColor:
                              log.status === 'Sent'
                                ? 'rgba(16, 185, 129, 0.08)'
                                : log.status === 'Simulator'
                                ? 'rgba(6, 182, 212, 0.08)'
                                : 'rgba(239, 68, 68, 0.08)',
                            color:
                              log.status === 'Sent'
                                ? 'var(--color-success)'
                                : log.status === 'Simulator'
                                ? 'var(--color-info)'
                                : 'var(--color-danger)',
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .table-row-hover:hover {
          background-color: var(--background-alt) !important;
        }
        .search-input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.1) !important;
        }
      `}</style>
    </DashboardLayout>
  );
}

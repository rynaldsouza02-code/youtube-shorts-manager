import React, { useState, useEffect } from 'react';
import { Mail, Trash2, Clock, User, CheckCircle2, AlertTriangle, RefreshCw, FileText, X } from 'lucide-react';

export default function EmailLogs({ addToast }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedError, setSelectedError] = useState(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email-logs');
      if (!res.ok) throw new Error('Failed to load email logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear the email accountability logs? This action cannot be undone.')) return;

    try {
      const res = await fetch('/api/email-logs', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear logs');
      addToast('Email delivery logs cleared successfully.', 'success');
      setLogs([]);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Calculate stats
  const totalLogs = logs.length;
  const successLogs = logs.filter(l => l.status === 'success').length;
  const failedLogs = logs.filter(l => l.status === 'failed').length;
  const successRate = totalLogs > 0 ? ((successLogs / totalLogs) * 100).toFixed(1) : '100.0';

  const getTypeBadge = (type) => {
    let color = '';
    let label = '';
    
    switch (type) {
      case 'test':
        color = 'rgba(6, 182, 212, 0.12)'; // Cyan
        label = 'SMTP Test';
        break;
      case 'completed':
        color = 'rgba(16, 185, 129, 0.12)'; // Green
        label = 'Publish Success';
        break;
      case 'scheduled':
        color = 'rgba(139, 92, 246, 0.12)'; // Purple
        label = 'Video Scheduled';
        break;
      case 'failed':
        color = 'rgba(239, 68, 68, 0.12)'; // Red
        label = 'Upload Failed';
        break;
      default:
        color = 'rgba(255, 255, 255, 0.05)';
        label = type;
    }

    return (
      <span style={{
        backgroundColor: color,
        color: type === 'test' ? 'var(--color-cyan)' : type === 'completed' ? 'var(--color-success)' : type === 'scheduled' ? 'var(--color-accent)' : 'var(--color-error)',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '4px 8px',
        borderRadius: '6px',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        border: '1px solid rgba(255, 255, 255, 0.03)'
      }}>
        {label}
      </span>
    );
  };

  return (
    <div className="tab-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="responsive-page-header">
        <div>
          <h1 className="page-title"><Mail size={28} color="var(--color-accent)" /> Email Account Log</h1>
          <p className="page-subtitle">Track, audit, and verify all SMTP notifications dispatched by the dashboard.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchLogs} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {totalLogs > 0 && (
            <button 
              onClick={handleClearLogs} 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--color-error)' }}
            >
              <Trash2 size={16} />
              Purge Logs
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-four-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={22} color="var(--color-accent)" style={{ margin: 'auto' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Mails</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0' }}>{totalLogs}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} color="var(--color-success)" style={{ margin: 'auto' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Successful</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-success)' }}>{successLogs}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} color="var(--color-error)" style={{ margin: 'auto' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Failed Deliveries</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-error)' }}>{failedLogs}</h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <RefreshCw size={22} color="var(--color-cyan)" style={{ margin: 'auto' }} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Success Rate</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--color-cyan)' }}>{successRate}%</h3>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading email accountability logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(139, 92, 246, 0.08)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <Mail size={32} color="var(--color-accent)" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>No Mail Audit Logs Recorded</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto' }}>
              Whenever a video completes processing, schedules, or fails, the resulting SMTP delivery status log will be captured here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sent Time</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Delivery</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const dateStr = new Date(log.sentAt).toLocaleString();
                  const isSuccess = log.status === 'success';
                  
                  return (
                    <tr 
                      key={log.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          {dateStr}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={14} color="var(--text-muted)" />
                          {log.recipient}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        {getTypeBadge(log.type)}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '0.9rem', fontWeight: 500, verticalAlign: 'middle', color: '#ffffff' }}>
                        {log.subject}
                      </td>
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                        {isSuccess ? (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            color: 'var(--color-success)', 
                            fontSize: '0.8rem', 
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.15)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }}></span>
                            Success
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedError(log)}
                            title="Click to view error log details"
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              color: 'var(--color-error)', 
                              fontSize: '0.8rem', 
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              cursor: 'pointer',
                              outline: 'none',
                              transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <span className="pulse-dot warning" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-error)', display: 'inline-block' }}></span>
                            Failed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 15, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'pageSlideUpFade 0.25s ease forwards'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '550px',
            padding: '24px',
            borderLeft: '4px solid var(--color-error)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ 
                margin: 0, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'var(--color-error)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem'
              }}>
                <FileText size={20} /> SMTP Error Diagnostic
              </h3>
              <button 
                onClick={() => setSelectedError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              The email dispatch failed on <strong style={{ color: '#fff' }}>{new Date(selectedError.sentAt).toLocaleString()}</strong> while sending to <strong style={{ color: '#fff' }}>{selectedError.recipient}</strong>.
            </p>

            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.04)', 
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#fca5a5',
              overflowY: 'auto',
              maxHeight: '200px',
              wordBreak: 'break-all',
              lineHeight: '1.5'
            }}>
              {selectedError.error || 'No SMTP response error recorded.'}
            </div>

            <button
              onClick={() => setSelectedError(null)}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '20px', height: '40px' }}
            >
              Close Diagnostic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

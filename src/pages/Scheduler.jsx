import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Sparkles, AlertCircle, Save, CheckCircle, RefreshCw, Zap, RotateCcw } from 'lucide-react';

export default function Scheduler({ settings, fetchSettings, uploads, fetchUploads, addToast }) {
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [niche, setNiche] = useState('');
  const [time, setTime] = useState('12:00');
  const [frequency, setFrequency] = useState('daily');
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleManualTrigger = async () => {
    if (!window.confirm('This will immediately trigger Gemini to generate a script and queue a video for background compilation. Proceed?')) return;
    setIsTriggering(true);
    try {
      const res = await fetch('/api/autopilot/trigger', { method: 'POST' });
      if (!res.ok) {
        let errorMsg = 'Failed to trigger autopilot manual run';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          } else {
            const rawText = await res.text();
            errorMsg = rawText.slice(0, 150) || errorMsg;
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }
      addToast('Autopilot script generated successfully! Compiling will start shortly.', 'success');
      fetchUploads();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleResetLastRun = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/autopilot/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset last run state');
      addToast('Autopilot daily run status reset successfully.', 'success');
      fetchSettings();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Sync state when settings are loaded
  useEffect(() => {
    if (settings && settings.autopilot) {
      setAutopilotEnabled(settings.autopilot.enabled || false);
      setNiche(settings.autopilot.niche || '');
      setTime(settings.autopilot.time || '12:00');
      setFrequency(settings.autopilot.frequency || 'daily');
    }
  }, [settings]);

  const handleSaveAutopilot = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedSettings = {
      ...settings,
      autopilot: {
        ...settings.autopilot,
        enabled: autopilotEnabled,
        niche: niche,
        time: time,
        frequency: frequency
      }
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });

      if (!res.ok) throw new Error('Failed to update autopilot scheduler settings');
      
      addToast('Autopilot scheduler updated successfully.', 'success');
      fetchSettings();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const scheduledUploads = uploads.filter(u => u.status === 'scheduled');

  return (
    <div className="tab-fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title"><CalendarIcon size={28} color="var(--color-shorts)" /> Autopilot Scheduler</h1>
        <p className="page-subtitle">Configure fully automated Shorts creation and release schedules.</p>
      </div>

      <div className="grid-sidebar-layout">
        {/* Left Column: Autopilot Config & Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <form onSubmit={handleSaveAutopilot} className="glass-panel" style={{ padding: '24px', height: 'fit-content', borderLeft: '4px solid var(--color-shorts)', boxShadow: 'var(--shadow-glow)' }}>
            <h3 style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
              <Sparkles size={18} color="var(--color-shorts)" /> Autopilot Engine
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Toggle switch */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>Enable Autopilot</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automate uploads daily</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autopilotEnabled}
                  onChange={(e) => setAutopilotEnabled(e.target.checked)}
                  style={{
                    width: '40px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: 'var(--color-shorts)'
                  }}
                />
              </div>

              <div>
                <label className="form-label" style={{ opacity: autopilotEnabled ? 1 : 0.5 }}>Autopilot Prompt Niche</label>
                <textarea 
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. mind-blowing space trivia, or motivational quotes for athletes"
                  required={autopilotEnabled}
                  disabled={!autopilotEnabled}
                  rows={3}
                  className="input-control"
                  style={{
                    resize: 'none',
                    opacity: autopilotEnabled ? 1 : 0.5
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ opacity: autopilotEnabled ? 1 : 0.5 }}>Frequency</label>
                  <select 
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    disabled={!autopilotEnabled}
                    className="input-control input-control-select"
                    style={{
                      opacity: autopilotEnabled ? 1 : 0.5
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ opacity: autopilotEnabled ? 1 : 0.5 }}>Posting Time</label>
                  <input 
                    type="time" 
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={!autopilotEnabled}
                    className="input-control"
                    style={{
                      opacity: autopilotEnabled ? 1 : 0.5
                    }}
                  />
                </div>
              </div>

              {autopilotEnabled && (
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(6, 182, 212, 0.05)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  display: 'flex',
                  gap: '8px',
                  color: 'var(--color-cyan)',
                  fontSize: '0.8rem',
                  lineHeight: '1.4'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    <strong>Autopilot compiler active:</strong> Keep this dashboard website open in your browser tab. The background worker generates scripts at the posting hour and runs visual compiling & uploading in the background automatically.
                  </span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSaving}
                style={{ width: '100%', display: 'flex', gap: '8px', height: '46px', marginTop: '10px' }}
              >
                {isSaving ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <Save size={18} /> Save Autopilot settings
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Autopilot Status Control Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
              <RefreshCw size={18} color="var(--color-cyan)" className={isTriggering ? 'animate-spin' : ''} /> Autopilot Status & Controls
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Autopilot Mode:</span>
                {settings?.autopilot?.enabled ? (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--color-success)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}>
                    Active / Armed
                  </span>
                ) : (
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-error)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}>
                    Disabled
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Daily Target Time:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>
                  {settings?.autopilot?.time ? (
                    (() => {
                      const [h, m] = settings.autopilot.time.split(':').map(Number);
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      const displayH = h % 12 || 12;
                      const displayM = m < 10 ? `0${m}` : m;
                      return `${displayH}:${displayM} ${ampm}`;
                    })()
                  ) : 'Not configured'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last Daily Run:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>
                  {settings?.autopilot?.lastRun 
                    ? new Date(settings.autopilot.lastRun).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                    : 'Never run today'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleManualTrigger}
                  disabled={isTriggering}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '38px',
                    fontSize: '0.85rem',
                    background: 'var(--color-cyan)',
                    borderColor: 'var(--color-cyan)',
                    color: '#fff'
                  }}
                >
                  {isTriggering ? (
                    <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                  ) : (
                    <>
                      <Zap size={14} /> Trigger Manual Run Now
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetLastRun}
                  disabled={isResetting || !settings?.autopilot?.lastRun}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '38px',
                    fontSize: '0.85rem',
                    opacity: settings?.autopilot?.lastRun ? 1 : 0.5,
                    cursor: settings?.autopilot?.lastRun ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isResetting ? (
                    <span className="spinner" style={{ width: '14px', height: '14px' }}></span>
                  ) : (
                    <>
                      <RotateCcw size={14} /> Reset Today's Run State
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scheduled releases */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 600 }}>Upcoming Scheduled Releases</h3>
          
          {scheduledUploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              <Clock size={48} style={{ margin: '0 auto 16px auto', strokeWidth: 1.5, opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: '1.05rem', color: '#fff', marginBottom: '6px' }}>No scheduled Shorts</p>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
                Your scheduler queue is empty. Generate and upload a Short, and choose "Schedule" at Step 4 to enqueue it.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduledUploads.map((item) => (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{item.title}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Scheduled: {new Date(item.scheduledAt).toLocaleDateString()} at {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: 'var(--color-warning)',
                    border: '1px solid rgba(245, 158, 11, 0.25)'
                  }}>
                    Queued
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

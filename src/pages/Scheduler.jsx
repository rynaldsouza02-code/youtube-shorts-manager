import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Sparkles, AlertCircle, Save, CheckCircle, RefreshCw } from 'lucide-react';

export default function Scheduler({ settings, fetchSettings, uploads, fetchUploads, addToast }) {
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [niche, setNiche] = useState('');
  const [time, setTime] = useState('12:00');
  const [frequency, setFrequency] = useState('daily');
  const [isSaving, setIsSaving] = useState(false);

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
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title"><CalendarIcon size={28} color="var(--color-shorts)" /> Autopilot Scheduler</h1>
        <p className="page-subtitle">Configure fully automated Shorts creation and release schedules.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '30px' }}>
        {/* Left Column: Autopilot Config */}
        <form onSubmit={handleSaveAutopilot} className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Autopilot Prompt Niche</label>
              <textarea 
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. mind-blowing space trivia, or motivational quotes for athletes"
                required={autopilotEnabled}
                disabled={!autopilotEnabled}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '0.9rem',
                  resize: 'none',
                  fontFamily: 'var(--font-sans)',
                  opacity: autopilotEnabled ? 1 : 0.5
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Frequency</label>
                <select 
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  disabled={!autopilotEnabled}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
                    opacity: autopilotEnabled ? 1 : 0.5
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Posting Time</label>
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={!autopilotEnabled}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.9rem',
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

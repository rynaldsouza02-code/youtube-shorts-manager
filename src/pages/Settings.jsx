import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Youtube, HelpCircle, Save, LogOut, Link2, Sparkles, Mail, Send } from 'lucide-react';

export default function Settings({ settings, fetchSettings, isChannelConnected, channelInfo, fetchChannelStatus, addToast }) {
  const [formData, setFormData] = useState({
    estimatedRPMShort: 3.0,
    estimatedCPMShort: 40.0,
    estimatedRPMLong: 150.0,
    estimatedCPMLong: 400.0,
    ...settings
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Sync state when settings load
  useEffect(() => {
    setFormData({
      estimatedRPMShort: settings?.estimatedRPMShort !== undefined ? settings.estimatedRPMShort : (settings?.estimatedRPM !== undefined ? settings.estimatedRPM : 3.0),
      estimatedCPMShort: settings?.estimatedCPMShort !== undefined ? settings.estimatedCPMShort : (settings?.estimatedCPM !== undefined ? settings.estimatedCPM : 40.0),
      estimatedRPMLong: settings?.estimatedRPMLong !== undefined ? settings.estimatedRPMLong : 150.0,
      estimatedCPMLong: settings?.estimatedCPMLong !== undefined ? settings.estimatedCPMLong : 400.0,
      ...settings
    });
  }, [settings]);

  // Check URL parameters for OAuth status redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    if (authStatus === 'success') {
      addToast('YouTube channel authenticated successfully!', 'success');
      fetchChannelStatus();
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
      const reason = urlParams.get('reason') || 'Unknown error';
      addToast(`Authentication failed: ${reason}`, 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      addToast('Configuration settings saved successfully.', 'success');
      fetchSettings();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Start YouTube OAuth link flow
  const handleConnectChannel = async () => {
    // Check for unsaved changes in YouTube credentials
    if (
      formData.youtubeClientId !== settings.youtubeClientId ||
      formData.youtubeClientSecret !== settings.youtubeClientSecret
    ) {
      addToast('You have unsaved changes in your credentials. Please click "Save Config Settings" first.', 'error');
      return;
    }

    if (!formData.youtubeClientId || !formData.youtubeClientSecret) {
      addToast('Please enter your YouTube Client ID and Client Secret first, then save.', 'error');
      return;
    }

    try {
      const res = await fetch('/auth/youtube');
      if (!res.ok) {
        let errorMsg = 'Failed to fetch YouTube auth redirect URL';
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
      const data = await res.json();
      if (data.url) {
        addToast('Redirecting to Google Consent screen...', 'info');
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not fetch auth redirect URL');
      }
    } catch (err) {
      addToast(`OAuth redirect failure: ${err.message}`, 'error');
    }
  };

  // Disconnect connected YouTube channel
  const handleDisconnectChannel = async () => {
    if (!window.confirm('Are you sure you want to disconnect your YouTube channel?')) return;

    try {
      const res = await fetch('/api/youtube/disconnect', { method: 'POST' });
      if (res.ok) {
        localStorage.removeItem('autoshorts_tokens');
        addToast('YouTube channel disconnected.', 'info');
        fetchChannelStatus();
      } else {
        throw new Error('Disconnect request failed');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // SMTP Configuration Test
  const [isTestingMail, setIsTestingMail] = useState(false);

  const handleTestEmail = async () => {
    if (!formData.smtpHost || !formData.smtpPort || !formData.smtpUser || !formData.smtpPass) {
      addToast('Please fill in SMTP Host, Port, Username, and Password to run the test.', 'error');
      return;
    }

    setIsTestingMail(true);
    addToast('Sending test email via SMTP...', 'info');

    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        let errMsg = 'Failed to send test email';
        try {
          const data = await res.json();
          errMsg = data.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      addToast('SMTP Test successful! Check your recipient inbox.', 'success');
    } catch (err) {
      addToast(`SMTP Test failed: ${err.message}`, 'error');
    } finally {
      setIsTestingMail(false);
    }
  };

  return (
    <div className="tab-fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Header */}
      <div className="responsive-page-header">
        <div>
          <h1 className="page-title"><SettingsIcon size={28} color="var(--color-shorts)" /> Settings</h1>
          <p className="page-subtitle">Configure credentials, API access keys, and channel details.</p>
        </div>
        <button 
          onClick={() => setShowGuide(!showGuide)} 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <HelpCircle size={18} />
          {showGuide ? 'Hide API Guide' : 'Show API Guide'}
        </button>
      </div>

      {/* Guide Banner */}
      {showGuide && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', borderLeft: '4px solid var(--color-cyan)', boxShadow: 'var(--shadow-glow-cyan)' }}>
          <h3 style={{ marginBottom: '14px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
            <Link2 size={18} color="var(--color-cyan)" /> Google API Credentials Setup Guide
          </h3>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-cyan)', textDecoration: 'underline' }}>Google Cloud Console</a> and create/select a project.</li>
            <li>Enable the <strong>YouTube Data API v3</strong> by searching in the API Library.</li>
            <li>Go to the <strong>OAuth consent screen</strong> configuration, set User Type to <strong>External</strong>, and fill in the details. Add scope: <code>.../auth/youtube.upload</code>.</li>
            <li>Go to <strong>Credentials</strong>, click <strong>Create Credentials</strong> &rarr; <strong>OAuth client ID</strong>.</li>
            <li>Select Application Type as <strong>Web application</strong>.</li>
            <li>Add Authorized Redirect URI: <code style={{ color: '#fff', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
              {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:3001/auth/youtube/callback' 
                : `${window.location.origin}/auth/youtube/callback`}
            </code></li>
            <li>Click Save, copy the generated <strong>Client ID</strong> and <strong>Client Secret</strong>, paste them below, and click <strong>Save Config</strong>.</li>
            <li>Finally, click the red <strong>Connect Channel</strong> button to authenticate.</li>
          </ol>
          <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            * For Pexels and Gemini API keys, visit their respective developer portals to generate free developer keys.
          </p>
        </div>
      )}

      <div className="grid-two-col">
        {/* Left Column: API Form */}
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section: credentials */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-shorts)', boxShadow: 'var(--shadow-glow)' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
              <Key size={18} color="var(--color-shorts)" /> API Credentials
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">YouTube Client ID</label>
                <input 
                  type="text" 
                  name="youtubeClientId"
                  value={formData.youtubeClientId || ''}
                  onChange={handleChange}
                  placeholder="Paste your OAuth Client ID"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">YouTube Client Secret</label>
                <input 
                  type="password" 
                  name="youtubeClientSecret"
                  value={formData.youtubeClientSecret || ''}
                  onChange={handleChange}
                  placeholder="Paste your OAuth Client Secret"
                  className="input-control"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0' }}></div>

              <div>
                <label className="form-label">Gemini API Key (Scripting)</label>
                <input 
                  type="password" 
                  name="geminiApiKey"
                  value={formData.geminiApiKey || ''}
                  onChange={handleChange}
                  placeholder="AI prompt script generator key"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">Pexels API Key (Stock Footage)</label>
                <input 
                  type="password" 
                  name="pexelsApiKey"
                  value={formData.pexelsApiKey || ''}
                  onChange={handleChange}
                  placeholder="Free Pexels developer key"
                  className="input-control"
                />
              </div>
            </div>
          </div>

          {/* Section: AI Engine Preferences */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-cyan)', boxShadow: 'var(--shadow-glow-cyan)' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
              <Sparkles size={18} color="var(--color-cyan)" /> AI Engines & Fallback Media Settings
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4' }}>
              All APIs below work together cooperatively. Visuals will search <strong>Pexels</strong> first, fallback to <strong>Unsplash</strong>, and finally generate custom imagery using <strong>Hugging Face (FLUX)</strong>. 
              Voiceovers will prioritize <strong>ElevenLabs</strong> (automatically choosing a voice matching the script tone), fallback to <strong>Gemini API (Google AI Studio)</strong>, and finally use <strong>Google Translate TTS</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Unsplash Access Key</label>
                <input 
                  type="password" 
                  name="unsplashApiKey"
                  value={formData.unsplashApiKey || ''}
                  onChange={handleChange}
                  placeholder="Paste your Unsplash Access Key"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">Hugging Face API Token</label>
                <input 
                  type="password" 
                  name="huggingFaceApiKey"
                  value={formData.huggingFaceApiKey || ''}
                  onChange={handleChange}
                  placeholder="Paste your Hugging Face Access Token"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">ElevenLabs API Key</label>
                <input 
                  type="password" 
                  name="elevenLabsApiKey"
                  value={formData.elevenLabsApiKey || ''}
                  onChange={handleChange}
                  placeholder="Paste your ElevenLabs API Key"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">ElevenLabs Voice ID (Default)</label>
                <input 
                  type="text" 
                  name="elevenLabsVoiceId"
                  value={formData.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'}
                  onChange={handleChange}
                  placeholder="e.g. 21m00Tcm4TlvDq8ikWAM (Rachel)"
                  className="input-control"
                />
              </div>
            </div>
          </div>

          {/* Section: SMTP Mail Configuration */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--color-accent)', boxShadow: 'var(--shadow-glow-purple)' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
              <Mail size={18} color="var(--color-accent)" /> SMTP Email Notifications
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0 10px 0' }}>
                <input 
                  type="checkbox" 
                  id="smtpNotificationsEnabled"
                  name="smtpNotificationsEnabled"
                  checked={formData.smtpNotificationsEnabled || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, smtpNotificationsEnabled: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--color-shorts)',
                    cursor: 'pointer'
                  }}
                />
                <label htmlFor="smtpNotificationsEnabled" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', cursor: 'pointer' }}>
                  Enable Email Notifications
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">SMTP Host</label>
                  <input 
                    type="text" 
                    name="smtpHost"
                    value={formData.smtpHost || ''}
                    onChange={handleChange}
                    placeholder="e.g. smtp.gmail.com"
                    className="input-control"
                  />
                </div>
                <div>
                  <label className="form-label">Port</label>
                  <input 
                    type="text" 
                    name="smtpPort"
                    value={formData.smtpPort || '587'}
                    onChange={handleChange}
                    placeholder="587"
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                <input 
                  type="checkbox" 
                  id="smtpSecure"
                  name="smtpSecure"
                  checked={formData.smtpSecure || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, smtpSecure: e.target.checked }))}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--color-cyan)',
                    cursor: 'pointer'
                  }}
                />
                <label htmlFor="smtpSecure" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Secure Connection (SSL/TLS - Port 465)
                </label>
              </div>

              <div>
                <label className="form-label">SMTP Username / Auth Email</label>
                <input 
                  type="text" 
                  name="smtpUser"
                  value={formData.smtpUser || ''}
                  onChange={handleChange}
                  placeholder="e.g. yourname@gmail.com"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">SMTP Password / App Password</label>
                <input 
                  type="password" 
                  name="smtpPass"
                  value={formData.smtpPass || ''}
                  onChange={handleChange}
                  placeholder="SMTP server password"
                  className="input-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Sender Email (From)</label>
                  <input 
                    type="email" 
                    name="smtpSender"
                    value={formData.smtpSender || ''}
                    onChange={handleChange}
                    placeholder="sender@gmail.com"
                    className="input-control"
                  />
                </div>
                <div>
                  <label className="form-label">Recipient Email (To)</label>
                  <input 
                    type="email" 
                    name="smtpRecipient"
                    value={formData.smtpRecipient || ''}
                    onChange={handleChange}
                    placeholder="recipient@gmail.com"
                    className="input-control"
                  />
                </div>
              </div>

              <button 
                type="button"
                onClick={handleTestEmail}
                className="btn btn-secondary"
                disabled={isTestingMail}
                style={{ 
                  marginTop: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: 'var(--color-accent)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {isTestingMail ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <Send size={16} /> Test SMTP Connection
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSaving}
            style={{ width: '100%', display: 'flex', gap: '8px', height: '46px' }}
          >
            {isSaving ? (
              <span className="spinner"></span>
            ) : (
              <>
                <Save size={18} /> Save Config Settings
              </>
            )}
          </button>
        </form>

        {/* Right Column: YouTube integration status & Defaults */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* YouTube Connection Widget */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
              <Youtube size={20} color="var(--color-shorts)" /> Channel Status
            </h3>

            {isChannelConnected && channelInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img 
                    src={channelInfo.avatar} 
                    alt={channelInfo.title} 
                    style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--color-shorts)' }}
                  />
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{channelInfo.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{channelInfo.customUrl}</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-success)', fontWeight: 600, marginTop: '4px' }}>
                      {parseInt(channelInfo.subscribers).toLocaleString()} Subscribers
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={handleDisconnectChannel} 
                  className="btn btn-secondary"
                  style={{ width: '100%', display: 'flex', gap: '8px', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--color-error)' }}
                >
                  <LogOut size={16} /> Disconnect Channel
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  background: 'rgba(255, 46, 85, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}>
                  <Youtube size={28} color="var(--color-shorts)" />
                </div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>No Channel Connected</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '280px', margin: '0 auto 20px auto' }}>
                  Enter your Client ID and Client Secret, save, and authenticate to link your channel.
                </p>
                <button 
                  onClick={handleConnectChannel} 
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', gap: '8px', background: 'var(--color-shorts)' }}
                >
                  <Youtube size={16} /> Authenticate YouTube Channel
                </button>
              </div>
            )}
          </div>

          {/* Default Upload Settings */}
          <div className="glass-panel" style={{ padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>Default Short Metadata</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label">Default Description Footer</label>
                <textarea 
                  name="defaultDescription"
                  value={formData.defaultDescription || ''}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter standard descriptions or links (e.g. Subscribe!)"
                  className="input-control"
                  style={{ resize: 'none' }}
                />
              </div>

              <div>
                <label className="form-label">Default Tags</label>
                <input 
                  type="text" 
                  name="defaultTags"
                  value={formData.defaultTags || ''}
                  onChange={handleChange}
                  placeholder="shorts, ai, comedy, educational"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">Video Category</label>
                <select 
                  name="defaultCategory"
                  value={formData.defaultCategory || '22'}
                  onChange={handleChange}
                  className="input-control input-control-select"
                >
                  <option value="1">Film & Animation</option>
                  <option value="2">Autos & Vehicles</option>
                  <option value="10">Music</option>
                  <option value="15">Pets & Animals</option>
                  <option value="17">Sports</option>
                  <option value="20">Gaming</option>
                  <option value="22">People & Blogs</option>
                  <option value="23">Comedy</option>
                  <option value="24">Entertainment</option>
                  <option value="25">News & Politics</option>
                  <option value="26">Howto & Style</option>
                  <option value="27">Education</option>
                  <option value="28">Science & Technology</option>
                </select>
              </div>

              <button 
                type="button"
                onClick={handleSaveSettings}
                className="btn btn-primary"
                disabled={isSaving}
                style={{ width: '100%', display: 'flex', gap: '8px', height: '42px', marginTop: '10px' }}
              >
                {isSaving ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <Save size={16} /> Save Default Metadata
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monetization & Financial Settings */}
          <div className="glass-panel" style={{ padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SettingsIcon size={18} color="var(--color-success)" /> Monetization & Financial Settings
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Shorts Settings */}
              <div style={{ borderBottom: '1px solid var(--border-color)', pb: '14px', marginBottom: '6px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-shorts)', marginBottom: '12px' }}>Shorts Payout Options</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Estimated Shorts RPM (₹ per 1,000 views)</label>
                    <input 
                      type="number" 
                      name="estimatedRPMShort"
                      step="0.01"
                      min="0.01"
                      max="100.0"
                      value={formData.estimatedRPMShort !== undefined ? formData.estimatedRPMShort : 3.0}
                      onChange={handleChange}
                      placeholder="e.g. 3.00"
                      className="input-control"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Estimated Shorts CPM (₹ per 1,000 impressions)</label>
                    <input 
                      type="number" 
                      name="estimatedCPMShort"
                      step="0.1"
                      min="0.1"
                      value={formData.estimatedCPMShort !== undefined ? formData.estimatedCPMShort : 40.0}
                      onChange={handleChange}
                      placeholder="e.g. 40.00"
                      className="input-control"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Long Video Settings */}
              <div style={{ marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)', marginBottom: '12px' }}>Long Widescreen Video Payout Options</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Estimated Long RPM (₹ per 1,000 views)</label>
                    <input 
                      type="number" 
                      name="estimatedRPMLong"
                      step="0.1"
                      min="0.1"
                      max="5000.0"
                      value={formData.estimatedRPMLong !== undefined ? formData.estimatedRPMLong : 150.0}
                      onChange={handleChange}
                      placeholder="e.g. 150.00"
                      className="input-control-success"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Estimated Long CPM (₹ per 1,000 impressions)</label>
                    <input 
                      type="number" 
                      name="estimatedCPMLong"
                      step="1"
                      min="1"
                      value={formData.estimatedCPMLong !== undefined ? formData.estimatedCPMLong : 400.0}
                      onChange={handleChange}
                      placeholder="e.g. 400.00"
                      className="input-control-success"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={handleSaveSettings}
                className="btn btn-success"
                disabled={isSaving}
                style={{ width: '100%', display: 'flex', gap: '8px', height: '42px', marginTop: '10px' }}
              >
                {isSaving ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <Save size={16} /> Save Financial Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

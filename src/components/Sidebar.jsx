import React from 'react';
import { LayoutDashboard, Video, Calendar, Settings, Youtube, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, channelInfo, isChannelConnected }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'creator', label: 'Create Short', icon: Video },
    { id: 'scheduler', label: 'Autopilot', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop/Tablet Sidebar Panel */}
      <div className="sidebar-panel">
        {/* Brand Header */}
        <div className="brand-container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '40px',
          padding: '0 8px',
          cursor: 'pointer'
        }} onClick={() => setCurrentPage('dashboard')}>
          <div style={{
            backgroundColor: 'var(--color-shorts)',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
            transition: 'transform 0.3s ease',
            flexShrink: 0
          }} className="animate-float">
            <Youtube size={22} color="#ffffff" />
          </div>
          <span className="brand-text" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1.35rem',
            letterSpacing: '-0.03em',
            background: 'var(--grad-shorts)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(255, 46, 85, 0.2)'
          }}>
            AutoShorts
          </span>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className="nav-button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'rgba(255, 46, 85, 0.08)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  outline: 'none',
                  borderLeft: isActive ? '4px solid var(--color-shorts)' : '4px solid transparent',
                  boxShadow: isActive ? '0 4px 12px rgba(255, 46, 85, 0.05)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderLeft = '4px solid rgba(255, 255, 255, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderLeft = '4px solid transparent';
                  }
                }}
              >
                <Icon size={18} style={{
                  color: isActive ? 'var(--color-shorts)' : 'inherit',
                  transition: 'color 0.3s ease',
                  flexShrink: 0
                }} />
                <span className="nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Integration Card at Bottom */}
        <div className="integration-card" style={{
          marginTop: 'auto',
          background: 'rgba(255, 255, 255, 0.01)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.01)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isChannelConnected ? (
              <>
                <span className="pulse-dot success" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-success)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Connected</span>
              </>
            ) : (
              <>
                <span className="pulse-dot warning" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-warning)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Offline</span>
              </>
            )}
          </div>
          
          {isChannelConnected && channelInfo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src={channelInfo.avatar} 
                alt={channelInfo.title} 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 46, 85, 0.2)',
                  boxShadow: 'var(--shadow-glow)',
                  flexShrink: 0
                }}
              />
              <div style={{ overflow: 'hidden' }}>
                <p style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>{channelInfo.title}</p>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>{parseInt(channelInfo.subscribers).toLocaleString()} subs</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                Connect your YouTube channel in settings to begin.
              </p>
              <button 
                onClick={() => setCurrentPage('settings')}
                className="btn btn-outline" 
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
              >
                Connect
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Top Header */}
      <div className="mobile-top-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setCurrentPage('dashboard')}>
          <div style={{
            backgroundColor: 'var(--color-shorts)',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Youtube size={16} color="#ffffff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1.1rem',
            letterSpacing: '-0.03em',
            background: 'var(--grad-shorts)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            AutoShorts
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isChannelConnected && channelInfo ? (
            <img 
              src={channelInfo.avatar} 
              alt={channelInfo.title} 
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1.5px solid var(--color-shorts)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)'
              }}
              onClick={() => setCurrentPage('settings')}
            />
          ) : (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              onClick={() => setCurrentPage('settings')}
            >
              <span className="pulse-dot warning" style={{ width: '6px', height: '6px' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

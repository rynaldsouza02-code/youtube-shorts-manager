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
    <div style={{
      width: '240px',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      padding: '24px 16px'
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '40px',
        padding: '0 8px'
      }}>
        <div style={{
          backgroundColor: 'var(--color-shorts)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Youtube size={20} color="#ffffff" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #fff 40%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'rgba(255, 46, 85, 0.12)' : 'transparent',
                color: isActive ? 'var(--color-shorts)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                outline: 'none',
                borderLeft: isActive ? '3px solid var(--color-shorts)' : '3px solid transparent'
              }}
              className={!isActive ? 'btn-secondary-hover-opacity' : ''}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Integration Card at Bottom */}
      <div style={{
        marginTop: 'auto',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isChannelConnected ? (
            <>
              <CheckCircle2 size={16} color="var(--color-success)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-success)' }}>Connected</span>
            </>
          ) : (
            <>
              <AlertTriangle size={16} color="var(--color-warning)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-warning)' }}>Offline</span>
            </>
          )}
        </div>
        
        {isChannelConnected && channelInfo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={channelInfo.avatar} 
              alt={channelInfo.title} 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.1)'
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
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Connect your YouTube channel in settings to begin.
            </p>
            <button 
              onClick={() => setCurrentPage('settings')}
              className="btn btn-outline" 
              style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Connect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

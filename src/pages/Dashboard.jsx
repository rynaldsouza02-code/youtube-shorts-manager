import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Eye, 
  Video, 
  Sparkles, 
  Plus, 
  Calendar, 
  ExternalLink, 
  Trash2, 
  BarChart3, 
  Heart, 
  MessageSquare, 
  Award, 
  ArrowUpRight, 
  Play, 
  Info, 
  X,
  DollarSign,
  TrendingUp,
  Gauge,
  Lightbulb
} from 'lucide-react';

export default function Dashboard({ channelInfo, isChannelConnected, uploads, fetchUploads, setCurrentPage, addToast, settings }) {
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' or 'analytics'
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [calcViews, setCalcViews] = useState(500000); // default 500k views
  const [calcRPM, setCalcRPM] = useState(0.04);

  // Sync calcRPM when settings load
  useEffect(() => {
    if (settings?.estimatedRPM !== undefined) {
      setCalcRPM(parseFloat(settings.estimatedRPM));
    }
  }, [settings]);
  // Filter completed uploads
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const totalUploaded = completedUploads.length;
  const totalScheduled = uploads.filter(u => u.status === 'scheduled').length;

  // Calculate views, likes, comments, averages across dashboard items
  const totalViews = completedUploads.reduce((sum, u) => sum + (parseInt(u.views) || 0), 0);
  const totalLikes = completedUploads.reduce((sum, u) => sum + (parseInt(u.likes) || 0), 0);
  const totalComments = completedUploads.reduce((sum, u) => sum + (parseInt(u.comments) || 0), 0);

  const rpm = settings?.estimatedRPM !== undefined ? parseFloat(settings.estimatedRPM) : 0.04;
  const cpm = settings?.estimatedCPM !== undefined ? parseFloat(settings.estimatedCPM) : 0.50;
  const totalViewsRef = isChannelConnected && channelInfo ? Math.max(parseInt(channelInfo.views || 0), totalViews) : totalViews;
  const currentSubs = isChannelConnected && channelInfo ? parseInt(channelInfo.subscribers || 0) : 0;

  const avgViews = totalUploaded > 0 ? Math.round(totalViews / totalUploaded) : 0;
  const avgLikes = totalUploaded > 0 ? Math.round(totalLikes / totalUploaded) : 0;
  
  // Total engagement rate: (likes + comments) / views
  const totalEngagement = totalLikes + totalComments;
  const avgEngagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : '0.00';

  // Sort top 3 videos by views descending
  const topVideos = [...completedUploads]
    .sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0))
    .slice(0, 3);

  // Prepare view distribution chart (latest 8 videos, oldest to newest)
  const chartData = [...completedUploads]
    .slice(0, 8)
    .reverse()
    .map((u, idx) => {
      const titleWord = u.title.replace('#shorts', '').trim().split(' ')[0] || `Vid ${idx + 1}`;
      return {
        label: titleWord.slice(0, 10),
        views: parseInt(u.views) || 0,
        title: u.title
      };
    });

  const maxViews = Math.max(...chartData.map(d => d.views), 10);
  const chartDataWithPct = chartData.map(d => ({
    ...d,
    pct: Math.max((d.views / maxViews) * 100, 4) // minimum height 4% for visual line
  }));

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Delete this upload record from history?')) return;
    try {
      const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Upload record deleted.', 'success');
        fetchUploads();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="tab-fade-in" style={{ maxWidth: '1140px', margin: '0 auto', position: 'relative' }}>
      {/* Header */}
      <div className="responsive-page-header">
        <div>
          <h1 className="page-title"><LayoutDashboard size={28} color="var(--color-shorts)" /> YouTube Manager</h1>
          <p className="page-subtitle">Completely manage your Shorts content compilation, scheduled uploads, and real-time statistics.</p>
        </div>
        <button 
          onClick={() => setCurrentPage('creator')} 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-glow)' }}
        >
          <Plus size={18} /> Create New Short
        </button>
      </div>

      {/* Grid: Analytics cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '36px'
      }}>
        {/* Subscribers Card */}
        <div className="glass-panel glass-panel-interactive accent-border-cyan accent-glow-cyan" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Subscribers</span>
            <Users size={20} color="var(--color-cyan)" />
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isChannelConnected && channelInfo ? parseInt(channelInfo.subscribers).toLocaleString() : '—'}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
            {isChannelConnected ? 'Linked channel subscribers' : 'Connect channel in Settings'}
          </p>
        </div>

        {/* Channel Views Card */}
        <div className="glass-panel glass-panel-interactive accent-border-purple accent-glow-purple" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Lifetime Channel Views</span>
            <Eye size={20} color="var(--color-accent)" />
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isChannelConnected && channelInfo ? Math.max(parseInt(channelInfo.views || 0), totalViews).toLocaleString() : '—'}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
            {isChannelConnected ? `All-time channel views (Video list views: ${totalViews.toLocaleString()})` : 'Authenticate to sync stats'}
          </p>
        </div>

        {/* Managed Shorts Card */}
        <div className="glass-panel glass-panel-interactive accent-border-pink accent-glow-pink" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Managed Uploads</span>
            <Video size={20} color="var(--color-shorts)" />
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-shorts) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {totalUploaded}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
            Fetched uploads & history
          </p>
        </div>

        {/* Scheduled Autopilot Card */}
        <div className="glass-panel glass-panel-interactive accent-border-success accent-glow-success" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Scheduled Queue</span>
            <Calendar size={20} color="var(--color-success)" />
          </div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-success) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {totalScheduled}
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
            Shorts queued for release
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="responsive-tabs">
        <button 
          onClick={() => setActiveTab('videos')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'videos' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'videos' ? '2px solid var(--color-shorts)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Video size={16} /> Video Manager
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'analytics' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--color-shorts)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <BarChart3 size={16} /> Analytics Insights
        </button>
        <button 
          onClick={() => setActiveTab('monetization')}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'monetization' ? '#fff' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'monetization' ? '2px solid var(--color-success)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <DollarSign size={16} /> Monetization Section
        </button>
      </div>

      {/* Tab: Video Manager */}
      {activeTab === 'videos' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.25rem', fontWeight: 600 }}>Upload History & Queue</h3>
          
          {uploads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
              <Video size={48} style={{ margin: '0 auto 16px auto', strokeWidth: 1.5, opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: '1.05rem', color: '#fff', marginBottom: '6px' }}>No video uploads found</p>
              <p style={{ fontSize: '0.85rem', maxWidth: '360px', margin: '0 auto 20px auto' }}>
                You haven't generated or uploaded any Shorts yet. Create your first Short using the creator.
              </p>
              <button 
                onClick={() => setCurrentPage('creator')}
                className="btn btn-outline" 
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Create a Short Now
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Title</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date Created</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Views</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>YouTube Link</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, width: '180px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px', fontWeight: 500, color: '#ffffff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`pulse-dot ${
                            item.status === 'completed' ? 'success' :
                            item.status === 'scheduled' ? 'warning' :
                            item.status === 'pending_compile' || item.status === 'processing' ? 'processing' :
                            'error'
                          }`} />
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            background: 
                              item.status === 'completed' ? 'rgba(16, 185, 129, 0.12)' :
                              item.status === 'scheduled' ? 'rgba(245, 158, 11, 0.12)' :
                              item.status === 'pending_compile' ? 'rgba(6, 182, 212, 0.12)' :
                              item.status === 'processing' ? 'rgba(139, 92, 246, 0.12)' :
                              'rgba(239, 68, 68, 0.12)',
                            color:
                              item.status === 'completed' ? 'var(--color-success)' :
                              item.status === 'scheduled' ? 'var(--color-warning)' :
                              item.status === 'pending_compile' ? 'var(--color-cyan)' :
                              item.status === 'processing' ? 'var(--color-accent)' :
                              'var(--color-error)',
                            border: `1px solid ${
                              item.status === 'completed' ? 'rgba(16, 185, 129, 0.25)' :
                              item.status === 'scheduled' ? 'rgba(245, 158, 11, 0.25)' :
                              item.status === 'pending_compile' ? 'rgba(6, 182, 212, 0.25)' :
                              item.status === 'processing' ? 'rgba(139, 92, 246, 0.25)' :
                              'rgba(239, 68, 68, 0.25)'
                            }`
                          }}>
                            {item.status === 'pending_compile' ? 'Autopilot script' : item.status}
                          </span>
                        </div>
                        {item.status === 'completed' && item.privacy && (
                          <span style={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: item.privacy === 'public' ? 'var(--color-success)' : 'var(--text-muted)',
                            marginTop: '6px',
                            marginLeft: '16px',
                            fontWeight: 500,
                            textTransform: 'capitalize'
                          }}>
                            ({item.privacy})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', color: '#ffffff', fontWeight: 600 }}>
                        {item.status === 'completed' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Eye size={14} color="var(--color-cyan)" />
                            {parseInt(item.views || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {item.youtubeUrl ? (
                          <a 
                            href={item.youtubeUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ 
                              color: 'var(--color-shorts)', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              textDecoration: 'none',
                              fontSize: '0.85rem'
                            }}
                          >
                            Watch <ExternalLink size={12} />
                          </a>
                        ) : item.scheduledAt ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Queue: {new Date(item.scheduledAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unavailable</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                        {item.status === 'completed' && (
                          <button 
                            onClick={() => setSelectedVideo(item)}
                            className="btn btn-outline"
                            style={{ 
                              padding: '5px 10px', 
                              fontSize: '0.75rem', 
                              borderColor: 'var(--border-color)', 
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px' 
                            }}
                          >
                            <BarChart3 size={12} color="var(--color-cyan)" /> Analytics
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteRecord(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            transition: 'color 0.2s',
                            padding: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Analytics Insights */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 46, 85, 0.1)', color: 'var(--color-shorts)' }}>
                <Eye size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Avg. Views / Video</span>
                <strong style={{ fontSize: '1.25rem' }}>{avgViews.toLocaleString()}</strong>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255, 235, 59, 0.1)', color: '#ffeb3b' }}>
                <Heart size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Avg. Likes / Video</span>
                <strong style={{ fontSize: '1.25rem' }}>{avgLikes.toLocaleString()}</strong>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-cyan)' }}>
                <MessageSquare size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Total Comments</span>
                <strong style={{ fontSize: '1.25rem' }}>{totalComments.toLocaleString()}</strong>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-accent)' }}>
                <Award size={22} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Engagement Rate</span>
                <strong style={{ fontSize: '1.25rem' }}>{avgEngagementRate}%</strong>
              </div>
            </div>
          </div>

          {/* Core Analytics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '30px' }}>
            {/* View Distribution Chart */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>View Distribution</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Comparative views of your latest uploaded Shorts.</p>
              
              {chartDataWithPct.length === 0 ? (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No published videos available to plot chart.
                </div>
              ) : (
                <div>
                  {/* Bar Chart Canvas */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '220px', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', position: 'relative' }}>
                    {chartDataWithPct.map((d, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div 
                          className="chart-bar"
                          style={{ 
                            width: '60%', 
                            height: `${d.pct}%`, 
                            background: 'linear-gradient(to top, var(--color-shorts) 0%, var(--color-cyan) 100%)',
                            borderRadius: '8px 8px 0 0',
                            position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            cursor: 'pointer',
                            boxShadow: '0 0 12px rgba(255, 46, 85, 0.2)'
                          }}
                          title={d.title}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scaleY(1.05)';
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scaleY(1)';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 46, 85, 0.2)';
                          }}
                        >
                          <span style={{ position: 'absolute', top: '-26px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            {d.views >= 1000 ? `${(d.views/1000).toFixed(1)}k` : d.views}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '70px', textAlign: 'center', fontWeight: 500 }} title={d.title}>
                          {d.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Top Performing Videos */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Top Performing</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Best videos on your channel sorted by views.</p>
              </div>

              {topVideos.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No published videos found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {topVideos.map((video, index) => (
                    <div key={video.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: index === 0 ? 'rgba(255,215,0,0.1)' : index === 1 ? 'rgba(192,192,192,0.1)' : 'rgba(205,127,50,0.1)',
                        color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {index + 1}
                      </div>

                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt="thumbnail" 
                          style={{ width: '40px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '40px', height: '60px', borderRadius: '4px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={14} color="var(--text-muted)" />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {video.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-cyan)' }}>
                          {video.views.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>views</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Monetization Section */}
      {activeTab === 'monetization' && (
        <div className="tab-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Top Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px'
          }}>
            {/* Estimated Earnings Card */}
            <div className="glass-panel glass-panel-interactive accent-border-success accent-glow-success" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Est. Total Earnings</span>
                <DollarSign size={20} color="var(--color-success)" />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-success) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ${(totalViewsRef * (rpm / 1000)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Based on {totalViewsRef.toLocaleString()} total views & ${rpm.toFixed(3)} RPM
              </p>
            </div>

            {/* Avg Earnings per Short */}
            <div className="glass-panel glass-panel-interactive accent-border-purple accent-glow-purple" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Avg. Earnings / Short</span>
                <TrendingUp size={20} color="var(--color-accent)" />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ${(totalUploaded > 0 ? (totalViews * (rpm / 1000)) / totalUploaded : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Calculated across {totalUploaded} managed Shorts
              </p>
            </div>

            {/* Configured RPM Card */}
            <div className="glass-panel glass-panel-interactive accent-border-pink accent-glow-pink" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Configured Shorts RPM</span>
                <Gauge size={20} color="var(--color-shorts)" />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-shorts) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ${rpm.toFixed(3)}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Revenue per 1,000 views (set in settings)
              </p>
            </div>

            {/* Est Ad Impressions */}
            <div className="glass-panel glass-panel-interactive accent-border-cyan accent-glow-cyan" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Est. Ad Impressions</span>
                <Eye size={20} color="var(--color-cyan)" />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-cyan) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {Math.round(totalViewsRef * 0.7).toLocaleString()}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Est. ad playbacks (approx 70% ad coverage)
              </p>
            </div>
          </div>

          {/* YouTube Partner Program Milestones */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
            {/* Sub Milestones */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--color-cyan)" /> Subscribers Milestone (YPP)
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Tracks progress towards the YouTube Partner Program subscriber thresholds.
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span>Current Subs: <strong style={{ color: 'var(--color-cyan)' }}>{currentSubs.toLocaleString()}</strong></span>
                  <span>Target: <strong>1,000</strong></span>
                </div>
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((currentSubs / 1000) * 100, 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-cyan) 0%, var(--color-accent) 100%)',
                    borderRadius: '6px'
                  }} />
                  {/* Milestone notches/ticks */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: currentSubs >= 500 ? 'var(--bg-primary)' : 'rgba(255,255,255,0.25)',
                    zIndex: 2
                  }} title="Early Access Milestone (500 subs)" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <span>0</span>
                  <span style={{ color: currentSubs >= 500 ? 'var(--color-cyan)' : 'var(--text-muted)', fontWeight: currentSubs >= 500 ? 600 : 400 }}>500 (Early Access)</span>
                  <span>1,000 (Full YPP)</span>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem' }}>
                {currentSubs >= 1000 ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Sub target met for YouTube Partner Program!</span>
                ) : currentSubs >= 500 ? (
                  <span style={{ color: 'var(--color-warning)' }}>You have met the early access sub milestone! <strong>{1000 - currentSubs} more</strong> for full ad monetization.</span>
                ) : (
                  <span>Need <strong>{500 - currentSubs} more</strong> subscribers for Early Access features.</span>
                )}
              </div>
            </div>

            {/* Views Milestones */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="var(--color-shorts)" /> Shorts Views Milestone (90 Days)
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Tracks progress towards the YouTube Shorts views milestones.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span>Current Views: <strong style={{ color: 'var(--color-shorts)' }}>{totalViewsRef.toLocaleString()}</strong></span>
                  <span>Target: <strong>10,000,000</strong></span>
                </div>
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((totalViewsRef / 10000000) * 100, 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--color-shorts) 0%, var(--color-cyan) 100%)',
                    borderRadius: '6px'
                  }} />
                  {/* Milestone notches/ticks */}
                  <div style={{
                    position: 'absolute',
                    left: '30%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: totalViewsRef >= 3000000 ? 'var(--bg-primary)' : 'rgba(255,255,255,0.25)',
                    zIndex: 2
                  }} title="Early Access Milestone (3M views)" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <span>0</span>
                  <span style={{ color: totalViewsRef >= 3000000 ? 'var(--color-shorts)' : 'var(--text-muted)', fontWeight: totalViewsRef >= 3000000 ? 600 : 400 }}>3M (Early Access)</span>
                  <span>10M (Full YPP)</span>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem' }}>
                {totalViewsRef >= 10000000 ? (
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Views target met for YouTube Partner Program!</span>
                ) : totalViewsRef >= 3000000 ? (
                  <span style={{ color: 'var(--color-warning)' }}>You have met the early access views milestone! <strong>{(10000000 - totalViewsRef).toLocaleString()} more</strong> views for full ad monetization.</span>
                ) : (
                  <span>Need <strong>{(3000000 - totalViewsRef).toLocaleString()} more</strong> views for Early Access features.</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Calculator & Earnings Guide */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            
            {/* Interactive Calculator Widget */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--color-cyan)" /> Shorts Projected Earnings Calculator
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Adjust projected monthly views and custom RPM to forecast estimated payouts.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Views Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Projected Monthly Views</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-cyan)' }}>
                      {calcViews >= 1000000 ? `${(calcViews / 1000000).toFixed(1)}M` : calcViews >= 1000 ? `${(calcViews / 1000).toFixed(0)}k` : calcViews}
                    </strong>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="10000000"
                    step="5000"
                    value={calcViews}
                    onChange={(e) => setCalcViews(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--color-cyan)',
                      background: 'rgba(255,255,255,0.05)',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>1k</span>
                    <span>1M</span>
                    <span>5M</span>
                    <span>10M</span>
                  </div>
                </div>

                {/* RPM Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Estimated RPM ($)</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-shorts)' }}>
                      ${calcRPM.toFixed(3)}
                    </strong>
                  </div>
                  <input 
                    type="range"
                    min="0.01"
                    max="0.20"
                    step="0.005"
                    value={calcRPM}
                    onChange={(e) => setCalcRPM(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--color-shorts)',
                      background: 'rgba(255,255,255,0.05)',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>$0.01</span>
                    <span>$0.05</span>
                    <span>$0.10</span>
                    <span>$0.20</span>
                  </div>
                </div>

                {/* Calculator Result Card */}
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px'
                }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Estimated Monthly Revenue</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Formula: (Views / 1000) * RPM</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      fontFamily: 'var(--font-display)',
                      color: '#fff',
                      textShadow: '0 0 15px rgba(6, 182, 212, 0.4)'
                    }}>
                      ${((calcViews * calcRPM) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Niche RPM Guide */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lightbulb size={18} color="var(--color-warning)" /> Niche RPM Analytics
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Typical revenue standards for Shorts by category.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Finance & Business</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High CPM Niche</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>$0.08 – $0.15</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Tech & AI</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High CPM Niche</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>$0.06 – $0.12</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Lifestyle & Health</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Standard CPM Niche</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-cyan)' }}>$0.04 – $0.08</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Gaming & Memes</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Low CPM Niche</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-shorts)' }}>$0.01 – $0.03</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>💡 Autopilot Optimization:</strong>
                Targeting finance or technology topics inside your automated Shorts content creation will yield up to 10x higher revenue compared to general humor.
              </div>
            </div>

          </div>

          {/* Earnings Breakdown Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>Shorts Video Earnings Breakdown</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Individual earnings estimates for all completed Shorts based on your RPM.</p>

            {completedUploads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                No completed video uploads found to compute individual earnings.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Short Title</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Views</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Shorts RPM</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Est. Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedUploads.map((item) => {
                      const viewsVal = parseInt(item.views || 0);
                      const earnings = viewsVal * (rpm / 1000);
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '16px', fontWeight: 500, color: '#ffffff', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </td>
                          <td style={{ padding: '16px', color: '#ffffff', fontWeight: 600 }}>
                            {viewsVal.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                            ${rpm.toFixed(3)}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                            ${earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Video Analytics Inspector Modal */}
      {selectedVideo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 6, 10, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--color-shorts)" /> Short Stats Inspector
              </h3>
              <button 
                onClick={() => setSelectedVideo(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Short Metadata Header */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {selectedVideo.thumbnail ? (
                  <img 
                    src={selectedVideo.thumbnail} 
                    alt="thumbnail" 
                    style={{ width: '64px', height: '96px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                  />
                ) : (
                  <div style={{ width: '64px', height: '96px', borderRadius: '8px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                    <Play size={20} color="var(--text-muted)" />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '8px', lineHeight: '1.4' }}>
                    {selectedVideo.title}
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Published: <strong>{new Date(selectedVideo.createdAt).toLocaleDateString()}</strong></span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>Status: <strong style={{ color: 'var(--color-success)' }}>{selectedVideo.status}</strong></span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="responsive-modal-metrics">
                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <Eye size={18} color="var(--color-cyan)" style={{ marginBottom: '6px' }} />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Views</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{parseInt(selectedVideo.views || 0).toLocaleString()}</strong>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <Heart size={18} color="var(--color-shorts)" style={{ marginBottom: '6px' }} />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Likes</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{parseInt(selectedVideo.likes || 0).toLocaleString()}</strong>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <MessageSquare size={18} color="var(--color-success)" style={{ marginBottom: '6px' }} />
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Comments</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{parseInt(selectedVideo.comments || 0).toLocaleString()}</strong>
                </div>
              </div>

              {/* Engagement Insight Card */}
              <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.15)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} color="var(--color-accent)" /> Engagement Rate
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--color-accent)' }}>
                    {selectedVideo.views > 0 
                      ? (((parseInt(selectedVideo.likes || 0) + parseInt(selectedVideo.comments || 0)) / parseInt(selectedVideo.views)) * 100).toFixed(2)
                      : '0.00'}%
                  </strong>
                </div>
                <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(
                      selectedVideo.views > 0 
                        ? (((parseInt(selectedVideo.likes || 0) + parseInt(selectedVideo.comments || 0)) / parseInt(selectedVideo.views)) * 100) * 5
                        : 0,
                      100
                    )}%`,
                    height: '100%',
                    background: 'var(--color-accent)'
                  }}></div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  * Engagement rate indicates how actively your viewers liked or commented relative to total views. A rate above 3% is considered good for Shorts.
                </p>
              </div>

              {/* Suggestions Tips */}
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <Info size={18} color="var(--color-cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: '2px' }}>Manager Action Tip:</strong>
                  {parseInt(selectedVideo.views || 0) < 50 ? (
                    "This video is in its early launch phase. To boost views, try sharing the short's link or optimization of hashtags inside your video description."
                  ) : "Excellent visual retention! Maintain this layout and script structure for subsequent Shorts to build a consistent fan base."}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', justifyContent: 'flex-end' }}>
              <a 
                href={selectedVideo.youtubeUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Watch on YouTube <ExternalLink size={14} />
              </a>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

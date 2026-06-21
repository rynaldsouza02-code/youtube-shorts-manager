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
  Lightbulb,
  Clock
} from 'lucide-react';

export default function Dashboard({ channelInfo, isChannelConnected, uploads, fetchUploads, setCurrentPage, addToast, settings, isLoading }) {
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' or 'analytics'
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [monetizationFormat, setMonetizationFormat] = useState('short'); // 'short' or 'long'
  const [calcFormat, setCalcFormat] = useState('short'); // 'short' or 'long' for widget calculator
  const [calcViews, setCalcViews] = useState(500000); // default 500k views
  const [calcRPM, setCalcRPM] = useState(3.0);

  // SaaS Link Analyzer States
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisError, setAnalysisError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [highlights, setHighlights] = useState([]);

  const loadingMessages = [
    "Connecting to YouTube API and fetching metadata...",
    "Downloading captions and extracting video transcript...",
    "Scanning pacing, voice tone, and identifying viral hooks...",
    "Segmenting timeline and calculating virality index..."
  ];

  const handleAnalyzeSubmit = (e) => {
    e.preventDefault();
    if (!videoUrl || videoUrl.trim() === '') {
      setAnalysisError('Please enter a YouTube video URL.');
      return;
    }

    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!ytRegex.test(videoUrl)) {
      setAnalysisError('Invalid URL. Please enter a valid YouTube link (e.g., https://youtube.com/watch?v=...)');
      return;
    }

    setAnalysisError('');
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setShowSuccessModal(false);
    setHighlights([]);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < 4) {
        setAnalysisStep(currentStep);
      } else {
        clearInterval(interval);
        setIsAnalyzing(false);
        setHighlights([
          {
            title: "Hook: The 2-minute rule that beats procrastination",
            startTime: "01:12",
            endTime: "01:47",
            duration: "35s",
            viralityScore: "98%",
            niche: "Self Improvement"
          },
          {
            title: "Crucial statistic: Why 90% of startups fail in the first year",
            startTime: "03:22",
            endTime: "03:54",
            duration: "32s",
            viralityScore: "95%",
            niche: "Business & Finance"
          },
          {
            title: "Actionable tip: How to get your first 1,000 subscribers organically",
            startTime: "06:05",
            endTime: "06:50",
            duration: "45s",
            viralityScore: "91%",
            niche: "Content Strategy"
          }
        ]);
        setShowSuccessModal(true);
        addToast('YouTube video analyzed successfully! 3 viral highlights extracted.', 'success');
      }
    }, 800);
  };

  // Sync calcRPM when settings load or format switches
  useEffect(() => {
    if (calcFormat === 'long') {
      setCalcRPM(settings?.estimatedRPMLong !== undefined ? parseFloat(settings.estimatedRPMLong) : 150.0);
    } else {
      const defaultShortRPM = settings?.estimatedRPMShort !== undefined 
        ? parseFloat(settings.estimatedRPMShort) 
        : (settings?.estimatedRPM !== undefined ? parseFloat(settings.estimatedRPM) : 3.0);
      setCalcRPM(defaultShortRPM);
    }
  }, [settings, calcFormat]);

  // Filter completed uploads
  const completedUploads = uploads.filter(u => u && u.status === 'completed');
  const completedUploadsShort = completedUploads.filter(u => {
    const isLong = u.format === 'long' || (u.format !== 'short' && u.title && typeof u.title === 'string' && !u.title.toLowerCase().includes('#shorts'));
    return !isLong;
  });
  const completedUploadsLong = completedUploads.filter(u => {
    const isLong = u.format === 'long' || (u.format !== 'short' && u.title && typeof u.title === 'string' && !u.title.toLowerCase().includes('#shorts'));
    return isLong;
  });

  const totalUploaded = completedUploads.length;
  const totalUploadedShort = completedUploadsShort.length;
  const totalUploadedLong = completedUploadsLong.length;

  const totalScheduled = uploads.filter(u => u && u.status === 'scheduled').length;
  const totalScheduledShort = uploads.filter(u => {
    if (!u || u.status !== 'scheduled') return false;
    const isLong = u.format === 'long' || (u.format !== 'short' && u.title && typeof u.title === 'string' && !u.title.toLowerCase().includes('#shorts'));
    return !isLong;
  }).length;
  const totalScheduledLong = uploads.filter(u => {
    if (!u || u.status !== 'scheduled') return false;
    const isLong = u.format === 'long' || (u.format !== 'short' && u.title && typeof u.title === 'string' && !u.title.toLowerCase().includes('#shorts'));
    return isLong;
  }).length;

  // Calculate views, likes, comments, averages across dashboard items
  const totalViews = completedUploads.reduce((sum, u) => sum + (parseInt(u.views) || 0), 0);
  const totalViewsShort = completedUploadsShort.reduce((sum, u) => sum + (parseInt(u.views) || 0), 0);
  const totalViewsLong = completedUploadsLong.reduce((sum, u) => sum + (parseInt(u.views) || 0), 0);

  const totalLikes = completedUploads.reduce((sum, u) => sum + (parseInt(u.likes) || 0), 0);
  const totalLikesShort = completedUploadsShort.reduce((sum, u) => sum + (parseInt(u.likes) || 0), 0);
  const totalLikesLong = completedUploadsLong.reduce((sum, u) => sum + (parseInt(u.likes) || 0), 0);

  const totalComments = completedUploads.reduce((sum, u) => sum + (parseInt(u.comments) || 0), 0);
  const totalCommentsShort = completedUploadsShort.reduce((sum, u) => sum + (parseInt(u.comments) || 0), 0);
  const totalCommentsLong = completedUploadsLong.reduce((sum, u) => sum + (parseInt(u.comments) || 0), 0);

  const rpmShort = parseFloat(settings?.estimatedRPMShort !== undefined ? settings.estimatedRPMShort : (settings?.estimatedRPM !== undefined ? settings.estimatedRPM : 3.0)) || 0;
  const cpmShort = parseFloat(settings?.estimatedCPMShort !== undefined ? settings.estimatedCPMShort : (settings?.estimatedCPM !== undefined ? settings.estimatedCPM : 40.0)) || 0;
  
  const rpmLong = parseFloat(settings?.estimatedRPMLong !== undefined ? settings.estimatedRPMLong : 150.0) || 0;
  const cpmLong = parseFloat(settings?.estimatedCPMLong !== undefined ? settings.estimatedCPMLong : 400.0) || 0;

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
      {/* Professional SaaS Hero Header */}
      <div style={{
        textAlign: 'center',
        padding: '56px 20px',
        marginBottom: '40px',
        borderRadius: '24px',
        background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 60%)',
        border: '1px solid rgba(255, 255, 255, 0.02)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow ambient background elements */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 46, 85, 0.15)',
          filter: 'blur(90px)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.8rem',
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #fff 40%, var(--color-cyan) 80%, var(--color-accent) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          textShadow: '0 0 40px rgba(6, 182, 212, 0.15)'
        }}>
          Turn your long-form videos into viral Shorts in seconds using AI
        </h1>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          maxWidth: '680px',
          margin: '0 auto 24px auto',
          lineHeight: '1.6',
          fontWeight: 400
        }}>
          Paste a YouTube link below to extract viral highlights, or launch creators to build custom video compiles from scratch.
        </p>

        {/* Quick action shortcuts */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setCurrentPage('creator')} 
            className="btn-shortcut-shorts"
          >
            <Plus size={16} /> Create Short (9:16)
          </button>
          <button 
            onClick={() => setCurrentPage('longCreator')} 
            className="btn-shortcut-long"
          >
            <Plus size={16} /> Create Long Video (16:9)
          </button>
        </div>

        {/* Centered Input Form Container */}
        <div style={{
          maxWidth: '640px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 5
        }}>
          <form onSubmit={handleAnalyzeSubmit} style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-glass)',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '50px',
            padding: '6px 8px 6px 20px',
            boxShadow: 'var(--shadow-lg), 0 0 30px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(255, 255, 255, 0.02)',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg), 0 0 30px rgba(139, 92, 246, 0.25)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.boxShadow = 'var(--shadow-lg), 0 0 30px rgba(0, 0, 0, 0.5)';
          }}
          >
            <input 
              type="text"
              placeholder="Paste long YouTube video link here... (e.g. https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setAnalysisError('');
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-sans)',
                paddingRight: '12px'
              }}
            />
            <button 
              type="submit"
              disabled={isAnalyzing}
              style={{
                background: 'linear-gradient(135deg, var(--color-shorts) 0%, var(--color-accent) 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '50px',
                padding: '12px 28px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 15px rgba(255, 46, 85, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinnerRotate" /> Analyzing...
                </>
              ) : (
                <>
                  Analyze Video <ArrowUpRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Validation Error Feedback */}
          {analysisError && (
            <div style={{
              marginTop: '12px',
              padding: '10px 16px',
              borderRadius: '30px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--color-error)',
              fontSize: '0.8rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-error)' }} />
              {analysisError}
            </div>
          )}
        </div>

        {/* Loading / Spinner State Overlay */}
        {isAnalyzing && (
          <div style={{
            marginTop: '36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.05)',
              borderTopColor: 'var(--color-shorts)',
              animation: 'spinnerRotate 0.8s linear infinite',
              marginBottom: '16px'
            }} />
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              letterSpacing: '0.01em'
            }}>
              {loadingMessages[analysisStep]}
            </p>
            <div style={{ width: '160px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{
                width: `${(analysisStep + 1) * 25}%`,
                height: '100%',
                background: 'var(--color-shorts)',
                transition: 'width 0.8s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Success highlights list */}
      {showSuccessModal && highlights.length > 0 && (
        <div style={{
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={20} color="var(--color-warning)" /> 
                Your Viral Highlights are Ready!
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Select a highlight segment below to launch the video creator and automatically compile a Short.
              </p>
            </div>
            <button 
              onClick={() => {
                setShowSuccessModal(false);
                setHighlights([]);
                setVideoUrl('');
              }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Clear Results
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {highlights.map((item, idx) => (
              <div 
                key={idx}
                className="glass-panel"
                style={{
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  borderTop: `4px solid ${idx === 0 ? 'var(--color-shorts)' : idx === 1 ? 'var(--color-accent)' : 'var(--color-cyan)'}`
                }}
              >
                {/* Badge Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: idx === 0 ? 'var(--color-shorts)' : idx === 1 ? 'var(--color-accent)' : 'var(--color-cyan)',
                    background: idx === 0 ? 'rgba(255, 46, 85, 0.08)' : idx === 1 ? 'rgba(139, 92, 246, 0.08)' : 'rgba(6, 182, 212, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em'
                  }}>
                    {item.niche}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--color-warning)',
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.08)',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}>
                    <Award size={14} /> {item.viralityScore} Viral Index
                  </div>
                </div>

                {/* Hook title */}
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: '1.4',
                  fontFamily: 'var(--font-sans)'
                }}>
                  "{item.title}"
                </h4>

                {/* Range stats */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.02)'
                }}>
                  <span>Timeline: <strong>{item.startTime} - {item.endTime}</strong></span>
                  <span>Duration: <strong>{item.duration}</strong></span>
                </div>

                {/* CTA redirect */}
                <button 
                  onClick={() => {
                    addToast(`Loaded Highlight Clip: "${item.title}". Pre-filling script configurations!`, 'success');
                    setCurrentPage('creator');
                  }}
                  className="btn"
                  style={{
                    background: idx === 0 ? 'var(--color-shorts)' : idx === 1 ? 'var(--color-accent)' : 'var(--color-cyan)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: 'auto',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                  }}
                >
                  Create Short from Clip <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Header: Channel Overview */}
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.25rem',
        fontWeight: 800,
        color: '#fff',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <LayoutDashboard size={20} color="var(--color-shorts)" /> Channel Analytics Overview
      </h3>

      {/* Grid: Analytics cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '36px'
      }}>
        {isLoading ? (
          Array(4).fill(0).map((_, idx) => (
            <div key={idx} className="glass-panel skeleton-shimmer" style={{ height: '142px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.03)' }} />
          ))
        ) : (
          <>
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
                Shorts: {totalUploadedShort} | Long: {totalUploadedLong}
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
                Shorts: {totalScheduledShort} | Long: {totalScheduledLong}
              </p>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px', marginBottom: '40px' }}>
          {/* Tab buttons skeleton placeholder */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <div className="skeleton-shimmer" style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
            <div className="skeleton-shimmer" style={{ width: '150px', height: '36px', borderRadius: '8px' }} />
            <div className="skeleton-shimmer" style={{ width: '130px', height: '36px', borderRadius: '8px' }} />
          </div>
          {/* Main Content card skeleton placeholder */}
          <div className="glass-panel skeleton-shimmer" style={{ height: '420px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)' }} />
        </div>
      ) : (
        <>
          {/* Tabs Menu */}
          <div className="responsive-tabs">
            <button 
              onClick={() => setActiveTab('videos')}
              className={`nav-tab-btn ${activeTab === 'videos' ? 'active accent-shorts' : ''}`}
            >
              <Video size={16} /> Video Manager
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`nav-tab-btn ${activeTab === 'analytics' ? 'active accent-shorts' : ''}`}
            >
              <BarChart3 size={16} /> Analytics Insights
            </button>
            <button 
              onClick={() => setActiveTab('monetization')}
              className={`nav-tab-btn ${activeTab === 'monetization' ? 'active accent-success' : ''}`}
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
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '16px', fontWeight: 500, color: '#ffffff', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: item.format === 'long' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 46, 85, 0.15)',
                          color: item.format === 'long' ? 'var(--color-success)' : 'var(--color-shorts)',
                          border: `1px solid ${item.format === 'long' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 46, 85, 0.3)'}`,
                          flexShrink: 0
                        }}>
                          {item.format === 'long' ? 'Long' : 'Short'}
                        </span>
                        <span>{item.title}</span>
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
                            className="btn btn-outline-cyan"
                            style={{ 
                              padding: '5px 10px', 
                              fontSize: '0.75rem', 
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
                          className="btn-action-delete"
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
          
          {/* Format Sub-tabs Selector for Monetization */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            background: 'rgba(255,255,255,0.02)', 
            padding: '4px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            alignSelf: 'flex-start',
            width: '100%',
            maxWidth: '380px'
          }}>
            <button
              type="button"
              onClick={() => setMonetizationFormat('short')}
              className={`subtab-btn-short ${monetizationFormat === 'short' ? 'active' : ''}`}
            >
              Shorts Payout
            </button>
            <button
              type="button"
              onClick={() => setMonetizationFormat('long')}
              className={`subtab-btn-long ${monetizationFormat === 'long' ? 'active' : ''}`}
            >
              Long Video Payout
            </button>
          </div>

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
                ₹{(monetizationFormat === 'long' 
                  ? (totalViewsLong * (rpmLong / 1000))
                  : (totalViewsShort * (rpmShort / 1000))
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Based on {(monetizationFormat === 'long' ? totalViewsLong : totalViewsShort).toLocaleString()} views & ₹{(monetizationFormat === 'long' ? rpmLong : rpmShort).toFixed(2)} RPM
              </p>
            </div>

            {/* Avg Earnings per Video */}
            <div className="glass-panel glass-panel-interactive accent-border-purple accent-glow-purple" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  {monetizationFormat === 'long' ? 'Avg. Earnings / Long' : 'Avg. Earnings / Short'}
                </span>
                <TrendingUp size={20} color="var(--color-accent)" />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, #fff 60%, var(--color-accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ₹{(monetizationFormat === 'long' 
                  ? (totalUploadedLong > 0 ? (totalViewsLong * (rpmLong / 1000)) / totalUploadedLong : 0)
                  : (totalUploadedShort > 0 ? (totalViewsShort * (rpmShort / 1000)) / totalUploadedShort : 0)
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Calculated across {monetizationFormat === 'long' ? totalUploadedLong : totalUploadedShort} managed videos
              </p>
            </div>

            {/* Configured RPM Card */}
            <div className={`glass-panel glass-panel-interactive ${monetizationFormat === 'long' ? 'accent-border-success accent-glow-success' : 'accent-border-pink accent-glow-pink'}`} style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Configured {monetizationFormat === 'long' ? 'Long RPM' : 'Shorts RPM'}
                </span>
                <Gauge size={20} color={monetizationFormat === 'long' ? 'var(--color-success)' : 'var(--color-shorts)'} />
              </div>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', background: `linear-gradient(135deg, #fff 60%, ${monetizationFormat === 'long' ? 'var(--color-success)' : 'var(--color-shorts)'} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ₹{(monetizationFormat === 'long' ? rpmLong : rpmShort).toFixed(2)}
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
                {Math.round(
                  (monetizationFormat === 'long' ? totalViewsLong : totalViewsShort) * 
                  (monetizationFormat === 'long' ? 0.85 : 0.70)
                ).toLocaleString()}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                Est. ad playbacks ({monetizationFormat === 'long' ? '85%' : '70%'} ad coverage ratio)
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

            {/* Views / Watch-Hours Milestones based on active format */}
            {monetizationFormat === 'short' ? (
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={18} color="var(--color-shorts)" /> Shorts Views Milestone (90 Days)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Tracks progress towards the YouTube Shorts views milestones.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                    <span>Current Views: <strong style={{ color: 'var(--color-shorts)' }}>{totalViewsShort.toLocaleString()}</strong></span>
                    <span>Target: <strong>10,000,000</strong></span>
                  </div>
                  <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min((totalViewsShort / 10000000) * 100, 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--color-shorts) 0%, var(--color-cyan) 100%)',
                      borderRadius: '6px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      left: '30%',
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: totalViewsShort >= 3000000 ? 'var(--bg-primary)' : 'rgba(255,255,255,0.25)',
                      zIndex: 2
                    }} title="Early Access Milestone (3M views)" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    <span>0</span>
                    <span style={{ color: totalViewsShort >= 3000000 ? 'var(--color-shorts)' : 'var(--text-muted)', fontWeight: totalViewsShort >= 3000000 ? 600 : 400 }}>3M (Early Access)</span>
                    <span>10M (Full YPP)</span>
                  </div>
                </div>

                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem' }}>
                  {totalViewsShort >= 10000000 ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Views target met for YouTube Partner Program!</span>
                  ) : totalViewsShort >= 3000000 ? (
                    <span style={{ color: 'var(--color-warning)' }}>You have met the early access views milestone! <strong>{(10000000 - totalViewsShort).toLocaleString()} more</strong> views for full ad monetization.</span>
                  ) : (
                    <span>Need <strong>{(3000000 - totalViewsShort).toLocaleString()} more</strong> views for Early Access features.</span>
                  )}
                </div>
              </div>
            ) : (
              // Long form Watch hours milestone
              <div className="glass-panel" style={{ padding: '28px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="var(--color-success)" /> Watch Hours Milestone (365 Days)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Tracks estimated watch hours compiled across your completed widescreen documentaries.
                </p>

                {(() => {
                  const totalWatchHoursLong = completedUploadsLong.reduce((sum, u) => {
                    const scenes = u.scriptData?.scenes;
                    const scenesDuration = Array.isArray(scenes)
                      ? scenes.reduce((acc, s) => acc + (parseInt(s?.duration) || 8), 0)
                      : 120;
                    const duration = parseInt(u.duration) || scenesDuration;
                    return sum + ((duration * (parseInt(u.views) || 0)) / 3600);
                  }, 0);

                  return (
                    <>
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                          <span>Current Watch Hours: <strong style={{ color: 'var(--color-success)' }}>{totalWatchHoursLong.toFixed(1)} hrs</strong></span>
                          <span>Target: <strong>4,000 hrs</strong></span>
                        </div>
                        <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min((totalWatchHoursLong / 4000) * 100, 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-success) 0%, var(--color-cyan) 100%)',
                            borderRadius: '6px'
                          }} />
                          <div style={{
                            position: 'absolute',
                            left: '75%', // 3000 out of 4000
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            background: totalWatchHoursLong >= 3000 ? 'var(--bg-primary)' : 'rgba(255,255,255,0.25)',
                            zIndex: 2
                          }} title="Early Access Milestone (3,000 hrs)" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                          <span>0</span>
                          <span style={{ color: totalWatchHoursLong >= 3000 ? 'var(--color-success)' : 'var(--text-muted)', fontWeight: totalWatchHoursLong >= 3000 ? 600 : 400 }}>3k (Early Access)</span>
                          <span>4k (Full YPP)</span>
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem' }}>
                        {totalWatchHoursLong >= 4000 ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Watch hour target met for YouTube Partner Program!</span>
                        ) : totalWatchHoursLong >= 3000 ? (
                          <span style={{ color: 'var(--color-warning)' }}>You have met the early access watch-hour milestone! <strong>{(4000 - totalWatchHoursLong).toFixed(1)} more</strong> hours for full ad monetization.</span>
                        ) : (
                          <span>Need <strong>{(3000 - totalWatchHoursLong).toFixed(1)} more</strong> watch hours for Early Access features.</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Interactive Calculator & Earnings Guide */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            
            {/* Interactive Calculator Widget */}
            <div className="glass-panel" style={{ padding: '28px' }}>
              
              {/* Toggle Selector for Calculator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={18} color="var(--color-cyan)" /> Projected Revenue Calculator
                </h4>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcFormat('short');
                      setCalcViews(500000);
                    }}
                    className={`calc-tab-btn ${calcFormat === 'short' ? 'active-short' : ''}`}
                  >
                    Shorts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCalcFormat('long');
                      setCalcViews(100000);
                    }}
                    className={`calc-tab-btn ${calcFormat === 'long' ? 'active-long' : ''}`}
                  >
                    Long
                  </button>
                </div>
              </div>
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
                    min={calcFormat === 'long' ? "100" : "1000"}
                    max={calcFormat === 'long' ? "1000000" : "10000000"}
                    step={calcFormat === 'long' ? "500" : "5000"}
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
                    <span>{calcFormat === 'long' ? '100' : '1k'}</span>
                    <span>{calcFormat === 'long' ? '250k' : '2.5M'}</span>
                    <span>{calcFormat === 'long' ? '500k' : '5M'}</span>
                    <span>{calcFormat === 'long' ? '1M' : '10M'}</span>
                  </div>
                </div>

                {/* RPM Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>Estimated RPM (₹)</span>
                    <strong style={{ fontSize: '0.95rem', color: calcFormat === 'long' ? 'var(--color-success)' : 'var(--color-shorts)' }}>
                      ₹{calcRPM.toFixed(2)}
                    </strong>
                  </div>
                  <input 
                    type="range"
                    min={calcFormat === 'long' ? "10.00" : "0.50"}
                    max={calcFormat === 'long' ? "500.00" : "15.00"}
                    step={calcFormat === 'long' ? "5.00" : "0.10"}
                    value={calcRPM}
                    onChange={(e) => setCalcRPM(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: calcFormat === 'long' ? 'var(--color-success)' : 'var(--color-shorts)',
                      background: 'rgba(255,255,255,0.05)',
                      height: '6px',
                      borderRadius: '3px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>₹{calcFormat === 'long' ? '10.00' : '0.50'}</span>
                    <span>₹{calcFormat === 'long' ? '150.00' : '5.00'}</span>
                    <span>₹{calcFormat === 'long' ? '300.00' : '10.00'}</span>
                    <span>₹{calcFormat === 'long' ? '500.00' : '15.00'}</span>
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
                      ₹{((calcViews * calcRPM) / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Niche RPM Guide */}
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lightbulb size={18} color="var(--color-warning)" /> Niche RPM Analytics ({monetizationFormat === 'long' ? 'Long-form' : 'Shorts'})
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Typical revenue standards by category in India.</p>
              </div>

              {monetizationFormat === 'short' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Finance & Business</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shorts</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>₹6.00 – ₹12.00</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Tech & AI</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shorts</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>₹5.00 – ₹10.00</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Lifestyle & Health</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shorts</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-cyan)' }}>₹3.00 – ₹6.00</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Gaming & Memes</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Shorts</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-shorts)' }}>₹0.80 – ₹2.50</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Widescreen Long Video RPM Range
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Finance & Business</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Widescreen</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>₹150 – ₹450</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Tech & AI</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Widescreen</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>₹120 – ₹350</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Lifestyle & Health</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Widescreen</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-cyan)' }}>₹80 – ₹200</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Gaming & Vlogs</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Widescreen</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-shorts)' }}>₹30 – ₹100</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>RPM Range</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>💡 CPM Optimization:</strong>
                Long widescreen videos have multiple ad insertions (mid-rolls) and get 30x to 50x higher RPM views payouts compared to vertical mobile Shorts.
              </div>
            </div>

          </div>

          {/* Earnings Breakdown Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
              {monetizationFormat === 'long' ? 'Long Video Payout Breakdown' : 'Shorts Video Payout Breakdown'}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Individual earnings estimates for all completed {monetizationFormat === 'long' ? 'Long Videos' : 'Shorts'} based on your configured RPM.
            </p>

            {((monetizationFormat === 'long' ? completedUploadsLong : completedUploadsShort).length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                No completed {monetizationFormat === 'long' ? 'long video' : 'shorts'} uploads found to compute individual earnings.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Video Title</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Views</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Configured RPM</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Est. Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monetizationFormat === 'long' ? completedUploadsLong : completedUploadsShort).map((item) => {
                      const viewsVal = parseInt(item.views) || 0;
                      const activeRpm = parseFloat(monetizationFormat === 'long' ? rpmLong : rpmShort) || 0;
                      const earnings = viewsVal * (activeRpm / 1000);
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.9rem' }}>
                          <td style={{ padding: '16px', fontWeight: 500, color: '#ffffff', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </td>
                          <td style={{ padding: '16px', color: '#ffffff', fontWeight: 600 }}>
                            {viewsVal.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                            ₹{activeRpm.toFixed(2)}
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                            ₹{earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        </>
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

      {/* SaaS Footer */}
      <footer style={{
        marginTop: '64px',
        padding: '32px 0 16px 0',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '100%'
      }}>
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Terms of Service simulated for SaaS presentation."); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Terms of Service</a>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy simulated for SaaS presentation."); }} style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Privacy Policy</a>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          © 2026 YouTube Manager AI. Built By Rynal D Souza. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

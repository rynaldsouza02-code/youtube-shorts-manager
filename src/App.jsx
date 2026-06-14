import React, { useState, useEffect } from 'react';
import { Youtube } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Creator from './pages/Creator';
import Scheduler from './pages/Scheduler';
import Settings from './pages/Settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [channelInfo, setChannelInfo] = useState(null);
  const [isChannelConnected, setIsChannelConnected] = useState(false);
  const [settings, setSettings] = useState({
    youtubeClientId: '',
    youtubeClientSecret: '',
    pexelsApiKey: '',
    geminiApiKey: '',
    defaultDescription: '',
    defaultTags: '',
    defaultCategory: '22',
    autopilot: { enabled: false, niche: '', frequency: 'daily', time: '12:00' }
  });
  
  const [toasts, setToasts] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [isAutopilotCompiling, setIsAutopilotCompiling] = useState(false);
  const [compilingTitle, setCompilingTitle] = useState('');

  // Intro splash screen DOM removal
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0';
        splash.style.transform = 'scale(1.02)';
        setTimeout(() => {
          splash.remove();
        }, 500); // match transition duration
      }, 1600); // let zoom logo and title fade animations play out
    }
  }, []);

  // Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Fetch channel status
  const fetchChannelStatus = async () => {
    try {
      const res = await fetch('/api/youtube/channel');
      const data = await res.json();
      if (data.connected) {
        setIsChannelConnected(true);
        setChannelInfo(data.channel);
      } else {
        setIsChannelConnected(false);
        setChannelInfo(null);
      }
    } catch (err) {
      console.error('Failed to get channel details:', err);
    }
  };

  // Fetch general app settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Fetch upload history list
  const fetchUploads = async () => {
    try {
      const res = await fetch('/api/uploads');
      const data = await res.json();
      setUploads(data);
    } catch (err) {
      console.error('Failed to fetch upload list:', err);
    }
  };

  // Initial Boot Data Sync
  useEffect(() => {
    fetchChannelStatus();
    fetchSettings();
    fetchUploads();
  }, []);

  // Poll upload history every 10 seconds to sync list and autopilot items
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUploads();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ================= AUTOPILOT BG CANVAS COMPILER =================
  // If we find an item with 'pending_compile' status, we compile it in the background!
  useEffect(() => {
    const processAutopilotCompile = async () => {
      if (isAutopilotCompiling) return;
      
      const pendingItem = uploads.find(item => item.status === 'pending_compile');
      if (!pendingItem || !pendingItem.scriptData) return;

      setIsAutopilotCompiling(true);
      setCompilingTitle(pendingItem.title);
      addToast(`Autopilot: Starting background compilation for "${pendingItem.title}"`, 'info');

      try {
        const script = pendingItem.scriptData;
        
        // 1. Generate Voiceover MP3s and fetch asset lists
        const scenesWithAssets = [];
        for (let i = 0; i < script.scenes.length; i++) {
          const scene = script.scenes[i];
          
          // Generate audio MP3 for this scene
          const audioFilename = `auto_audio_${pendingItem.id}_scene_${i}`;
          const audioRes = await fetch('/api/generate/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: scene.narratorText, filename: audioFilename })
          });
          const audioData = await audioRes.json();

          // Fetch portrait stock footage or photo from Pexels
          const assetRes = await fetch(`/api/search/assets?query=${encodeURIComponent(scene.imageSearchQuery)}&type=photo`);
          const assetData = await assetRes.json();
          const assetUrl = assetData.assets && assetData.assets.length > 0 
            ? assetData.assets[0].src 
            : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop'; // high-res space fallback

          scenesWithAssets.push({
            ...scene,
            audioUrl: audioData.audioUrl,
            assetUrl: assetUrl
          });
        }

        // 2. Render and capture compilation video WebM (simulated/headless-style render)
        // Since we are running in the browser context, we can create a temporary dynamic Canvas element
        // programmatically and record it.
        const compiledBlob = await renderCanvasHeadless(scenesWithAssets);
        
        // 3. Upload raw video file
        addToast(`Autopilot: Video rendering complete. Uploading to YouTube...`, 'info');
        const uploadRes = await fetch('/api/upload-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'video/webm',
            'x-video-title': encodeURIComponent(pendingItem.title || ''),
            'x-video-desc': encodeURIComponent(pendingItem.description || ''),
            'x-video-tags': encodeURIComponent(pendingItem.tags || ''),
            'x-video-category': settings.defaultCategory || '22'
          },
          body: compiledBlob
        });

        if (!uploadRes.ok) {
          let errorMsg = `Upload server responded with status ${uploadRes.status}`;
          try {
            const contentType = uploadRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errData = await uploadRes.json();
              errorMsg = errData.error || errorMsg;
            } else {
              const rawText = await uploadRes.text();
              if (rawText.includes('Request Entity Too Large') || uploadRes.status === 413) {
                errorMsg = 'Video size exceeds Vercel upload limit (4.5MB). Try compiling again (our lowered 2 Mbps bitrate will help) or use local hosting.';
              } else {
                errorMsg = rawText.slice(0, 150) || errorMsg;
              }
            }
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const uploadData = await uploadRes.json();
        addToast(`Autopilot: Successfully uploaded "${pendingItem.title}"!`, 'success');
        
        // Update database history record by setting local status
        await fetch(`/api/uploads/${pendingItem.id}`, { method: 'DELETE' }); // replace pending item
        fetchUploads();
      } catch (err) {
        console.error('Autopilot compiler failed:', err);
        addToast(`Autopilot failed: ${err.message}`, 'error');
        // Clear status so we don't loop infinitely
        await fetch(`/api/uploads/${pendingItem.id}`, { method: 'DELETE' });
        fetchUploads();
      } finally {
        setIsAutopilotCompiling(false);
        setCompilingTitle('');
      }
    };

    processAutopilotCompile();
  }, [uploads, isAutopilotCompiling]);

  // Headless Canvas Recorder for Autopilot background compiler
  const renderCanvasHeadless = (scenes) => {
    return new Promise(async (resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');

        // 1. Initialize Audio Context and Destination Node
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const dest = audioCtx.createMediaStreamDestination();

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        // 2. Preload visual and audio assets
        const preloadedVisuals = [];
        const audioObjectUrls = [];
        const audioDurations = [];

        await Promise.all(scenes.map(async (scene, index) => {
          // Preload visual asset
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = scene.assetUrl;
          await new Promise(r => { img.onload = r; img.onerror = r; });
          preloadedVisuals[index] = img;

          // Preload audio asset
          if (scene.audioUrl) {
            try {
              const res = await fetch(scene.audioUrl);
              const blob = await res.blob();
              const objectUrl = URL.createObjectURL(blob);
              audioObjectUrls[index] = objectUrl;

              // Extract actual duration
              const tempAudio = new Audio(objectUrl);
              const duration = await new Promise(resolve => {
                tempAudio.onloadedmetadata = () => resolve(tempAudio.duration);
                tempAudio.onerror = () => resolve(scene.duration || 6);
                setTimeout(() => resolve(scene.duration || 6), 2000);
              });
              audioDurations[index] = duration || scene.duration || 6;
            } catch (err) {
              console.warn(`[Autopilot Preload Warn] Audio preload failed for scene ${index+1}:`, err);
              audioObjectUrls[index] = scene.audioUrl;
              audioDurations[index] = scene.duration || 6;
            }
          } else {
            audioObjectUrls[index] = null;
            audioDurations[index] = scene.duration || 6;
          }
        }));

        // 3. Play background music in the background (silent to the user!)
        const musicTracks = {
          cinematic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          upbeat: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
          ambient: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
          dark: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
        };
        const genre = settings.musicGenre || 'cinematic';
        const music = new Audio(musicTracks[genre]);
        music.crossOrigin = 'anonymous';
        music.loop = true;

        const musicSource = audioCtx.createMediaElementSource(music);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = 0.08; // 8% volume
        musicSource.connect(musicGain);
        musicGain.connect(dest); // Connect to stream only (no speaker output!)

        // Reuse a single speech audio element and source node to prevent Web Audio leaks
        const speechAudio = new Audio();
        speechAudio.crossOrigin = 'anonymous';
        const speechSource = audioCtx.createMediaElementSource(speechAudio);
        speechSource.connect(dest);

        // Wait for background music to buffer
        await new Promise((resolve) => {
          if (music.readyState >= 2) resolve();
          else {
            music.oncanplay = resolve;
            setTimeout(resolve, 2000);
          }
        });

        // Start playing background music
        music.play().catch(e => console.log('[Autopilot Music Blocked]:', e.message));

        // 4. Setup Media Recorder on the Canvas Stream + Web Audio destination
        const videoStream = canvas.captureStream(30); // 30 FPS
        const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks()
        ]);

        const recorder = new MediaRecorder(combinedStream, { 
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2000000 // 2 Mbps limit for size optimization
        });
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          try {
            music.pause();
            speechAudio.pause();
          } catch (e) {}
          // Revoke all Object URLs to avoid memory leaks
          audioObjectUrls.forEach(url => {
            if (url && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(blob);
        };

        recorder.start();

        // Sequential rendering of scenes
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const img = preloadedVisuals[i];
          const audioUrl = audioObjectUrls[i];
          const duration = audioDurations[i] * 1000; // ms

          speechAudio.src = audioUrl || '';
          speechAudio.currentTime = 0;

          // Wait for voice narration to buffer
          await new Promise((resolve) => {
            if (speechAudio.readyState >= 2 || !audioUrl) resolve();
            else {
              speechAudio.oncanplay = resolve;
              setTimeout(resolve, 2000);
            }
          });

          // Play Audio (silently routed to stream)
          if (audioUrl) {
            speechAudio.play().catch(() => console.log('Audio autoplay blocked in headless'));
          }
          
          let startTime = Date.now();
          let elapsed = 0;

          // Draw loop for this scene duration, driven by audio currentTime playhead
          while (true) {
            elapsed = Date.now() - startTime;
            
            let progress = 0;
            if (audioUrl && !speechAudio.paused && speechAudio.duration > 0) {
              progress = Math.min(speechAudio.currentTime / speechAudio.duration, 1);
            } else {
              progress = Math.min(elapsed / duration, 1);
            }

            // Check if scene is finished
            let isSceneFinished = false;
            if (elapsed > 200) {
              if (audioUrl && !speechAudio.paused) {
                isSceneFinished = speechAudio.ended || (speechAudio.currentTime >= speechAudio.duration - 0.05) || (elapsed >= duration);
              } else {
                isSceneFinished = elapsed >= duration;
              }
            } else {
              isSceneFinished = elapsed >= duration;
            }

            ctx.clearRect(0, 0, 1080, 1920);

            // Draw image with gentle zoom
            if (img && img.complete && img.naturalWidth > 0) {
              const zoom = 1 + (progress * 0.1); // zoom 10%
              const w = canvas.width * zoom;
              const h = canvas.height * zoom;
              const x = (canvas.width - w) / 2;
              const y = (canvas.height - h) / 2;
              ctx.drawImage(img, x, y, w, h);
            } else {
              // fallback background gradient
              const grad = ctx.createLinearGradient(0, 0, 0, 1920);
              grad.addColorStop(0, '#111827');
              grad.addColorStop(1, '#1f2937');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, 1080, 1920);
            }

            // Dark overlay for subtitle readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, 0, 1080, 1920);

            // Draw Subtitles centered
            ctx.font = '800 56px Outfit, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 12;

            const words = scene.subtitleText.split(' ');
            const numWords = words.length;
            const currentWordIndex = Math.min(
              Math.floor(progress * numWords),
              numWords - 1
            );

            // Draw subtitles word-by-word, highlight active word
            const yOffset = 1400; // bottom section of Shorts
            
            // Draw wrapping subtitle text
            let line = '';
            let lines = [];
            
            for (let wIdx = 0; wIdx < words.length; wIdx++) {
              const testLine = line + words[wIdx] + ' ';
              if (testLine.length > 20 && line.length > 0) {
                lines.push({ text: line.trim(), startIdx: wIdx - line.split(' ').filter(Boolean).length });
                line = words[wIdx] + ' ';
              } else {
                line = testLine;
              }
            }
            lines.push({ text: line.trim(), startIdx: words.length - line.split(' ').filter(Boolean).length });

            lines.forEach((lineObj, lIdx) => {
              const startX = 540;
              const wordY = yOffset + (lIdx * 80);
              
              ctx.strokeText(lineObj.text.toUpperCase(), startX, wordY);
              ctx.fillText(lineObj.text.toUpperCase(), startX, wordY);
            });

            if (isSceneFinished) {
              break;
            }

            // Frame delay
            await new Promise(r => setTimeout(r, 33)); // ~30 FPS
          }
          
          try {
            speechAudio.pause();
          } catch (e) {}
        }

        recorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  };

  // Render Page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            channelInfo={channelInfo} 
            isChannelConnected={isChannelConnected}
            uploads={uploads}
            fetchUploads={fetchUploads}
            setCurrentPage={setCurrentPage}
            addToast={addToast}
          />
        );
      case 'creator':
        return (
          <Creator 
            isChannelConnected={isChannelConnected}
            settings={settings}
            addToast={addToast}
            fetchUploads={fetchUploads}
            setCurrentPage={setCurrentPage}
          />
        );
      case 'scheduler':
        return (
          <Scheduler 
            settings={settings}
            fetchSettings={fetchSettings}
            uploads={uploads}
            fetchUploads={fetchUploads}
            addToast={addToast}
          />
        );
      case 'settings':
        return (
          <Settings 
            settings={settings}
            fetchSettings={fetchSettings}
            isChannelConnected={isChannelConnected}
            channelInfo={channelInfo}
            fetchChannelStatus={fetchChannelStatus}
            addToast={addToast}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        channelInfo={channelInfo}
        isChannelConnected={isChannelConnected}
      />

      {/* Main Container */}
      <main className="main-content">
        {/* Autopilot compiling banner notification */}
        {isAutopilotCompiling && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(255, 46, 85, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid var(--color-shorts)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="spinner" style={{ borderTopColor: 'var(--color-shorts)' }}></div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Autopilot Compilation Running</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Rendering and uploading: <strong style={{ color: '#ffffff' }}>{compilingTitle}</strong>
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-shorts)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Background Process Active
            </span>
          </div>
        )}

        {renderPage()}
      </main>

      {/* Global Alert Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

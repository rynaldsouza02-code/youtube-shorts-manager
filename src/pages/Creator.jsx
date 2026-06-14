import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Edit2, Play, CheckCircle2, Video, Globe, Calendar, RefreshCw, UploadCloud } from 'lucide-react';
import PreviewPlayer from '../components/PreviewPlayer';

export default function Creator({ isChannelConnected, settings, addToast, fetchUploads, setCurrentPage }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilePct, setCompilePct] = useState(0);

  // Form Inputs
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('informative');
  const [musicGenre, setMusicGenre] = useState('cinematic');
  const [useVideoAssets, setUseVideoAssets] = useState(false);

  // Output Script data
  const [scriptData, setScriptData] = useState(null);
  const [scenes, setScenes] = useState([]);
  
  // Compiled file
  const [compiledVideoBlob, setCompiledVideoBlob] = useState(null);
  
  // Publish options
  const [publishMetadata, setPublishMetadata] = useState({
    title: '',
    description: '',
    tags: '',
    schedule: false,
    scheduleTime: ''
  });

  const [uploadSuccessData, setUploadSuccessData] = useState(null);

  // ================= STEP 1: GENERATE SCRIPT =================
  const handleGenerateScript = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGeneratingScript(true);
    addToast('Generating script using Gemini AI...', 'info');

    try {
      const res = await fetch('/api/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style })
      });

      if (!res.ok) throw new Error('Failed to generate script');
      const data = await res.json();
      
      setScriptData(data);
      setScenes(data.scenes.map(s => ({ ...s, assetUrl: '' }))); // init with empty assets
      
      // Auto-prefill metadata tags
      setPublishMetadata({
        title: data.title || '',
        description: `${data.description || ''}\n\n${settings.defaultDescription || ''}`,
        tags: `${data.tags || ''}, ${settings.defaultTags || ''}`,
        schedule: false,
        scheduleTime: ''
      });

      addToast('AI Script generated! Proceed to storyboard review.', 'success');
      setCurrentStep(2);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // ================= STEP 2: STORYBOARD ASSETS AND TTS =================
  const handleSceneTextChange = (index, field, value) => {
    setScenes(prev => prev.map((scene, i) => {
      if (i === index) {
        return { ...scene, [field]: value };
      }
      return scene;
    }));
  };

  // Trigger search for stock assets and fetch Google TTS audio for each scene in parallel (staggered)
  const handlePrepareAssetsAndTTS = async () => {
    setIsGeneratingVoice(true);
    addToast('Preparing voiceovers and searching stock media in parallel...', 'info');

    try {
      const typeStr = useVideoAssets ? 'video' : 'photo';
      const timestamp = Date.now();

      const promises = scenes.map(async (scene, i) => {
        // Stagger requests by 150ms to prevent triggering API rate limits / anti-spam blockers
        await new Promise(resolve => setTimeout(resolve, i * 150));

        // Create parallel fetches for both TTS audio and stock media search
        const ttsPromise = fetch('/api/generate/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: scene.narratorText, filename: `audio_${timestamp}_scene_${i}` })
        }).then(async (res) => {
          if (!res.ok) throw new Error(`TTS failed for scene ${i + 1}`);
          return res.json();
        });

        const assetPromise = fetch(`/api/search/assets?query=${encodeURIComponent(scene.imageSearchQuery)}&type=${typeStr}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`Asset search failed for scene ${i + 1}`);
            return res.json();
          });

        const [ttsData, assetData] = await Promise.all([ttsPromise, assetPromise]);

        let assetUrl = '';
        let assetType = 'photo';
        if (assetData.assets && assetData.assets.length > 0) {
          assetUrl = assetData.assets[0].src;
          assetType = assetData.assets[0].type || (useVideoAssets ? 'video' : 'photo');
        } else {
          assetUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1080&auto=format&fit=crop';
          assetType = 'photo';
        }

        return {
          ...scene,
          audioUrl: ttsData.audioUrl,
          assetUrl: assetUrl,
          assetType: assetType
        };
      });

      const updatedScenes = await Promise.all(promises);

      setScenes(updatedScenes);
      addToast('Assets ready! Proceeding to preview editor.', 'success');
      setCurrentStep(3);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleCompileFinished = (blob) => {
    setCompiledVideoBlob(blob);
    setIsCompiling(false);
    setCompilePct(100);
    setCurrentStep(4); // Automatically transition to next step (Metadata/Upload)
    addToast('Video compilation completed successfully! Ready to publish.', 'success');
  };

  // ================= STEP 4: UPLOAD VIDEO =================
  const handleUploadVideo = async () => {
    if (!compiledVideoBlob) {
      addToast('Please compile the video first before uploading.', 'error');
      return;
    }

    if (!isChannelConnected) {
      addToast('No YouTube channel connected. Connect in Settings first.', 'error');
      return;
    }

    setIsUploading(true);
    addToast(publishMetadata.schedule ? 'Queueing scheduled upload...' : 'Uploading video directly to YouTube...', 'info');

    try {
      const headers = {
        'Content-Type': 'video/webm',
        'x-video-title': encodeURIComponent(publishMetadata.title || ''),
        'x-video-desc': encodeURIComponent(publishMetadata.description || ''),
        'x-video-tags': encodeURIComponent(publishMetadata.tags || ''),
        'x-video-category': settings.defaultCategory || '22'
      };

      if (publishMetadata.schedule && publishMetadata.scheduleTime) {
        headers['x-schedule-time'] = new Date(publishMetadata.scheduleTime).toISOString();
      }

      const res = await fetch('/api/upload-video', {
        method: 'POST',
        headers: headers,
        body: compiledVideoBlob
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Video upload endpoint failed');
      }

      const data = await res.json();
      setUploadSuccessData(data.record);
      addToast(publishMetadata.schedule ? 'Short successfully scheduled!' : 'Short published successfully to YouTube!', 'success');
      fetchUploads();
      setCurrentStep(4);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="tab-fade-in" style={{ maxWidth: '980px', margin: '0 auto' }}>
      {/* Step Progress Nodes */}
      <div className="step-indicator">
        {/* Animated fill connector */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10px',
          right: '10px',
          height: '3px',
          background: 'var(--grad-shorts)',
          zIndex: 1,
          transform: 'translateY(-50%)',
          width: `${((currentStep - 1) / 3) * 96}%`,
          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 0 10px rgba(255, 46, 85, 0.5)'
        }} />
        <div className={`step-node ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>1</div>
        <div className={`step-node ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>2</div>
        <div className={`step-node ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>3</div>
        <div className={`step-node ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>4</div>
      </div>

      {/* ================= STEP 1: IDEA / GENERATOR ================= */}
      {currentStep === 1 && (
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '600px', margin: '0 auto', borderLeft: '4px solid var(--color-shorts)', boxShadow: 'var(--shadow-glow)' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-display)' }}>
            <Sparkles color="var(--color-shorts)" /> AI Shorts Creator
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Describe your idea, and Gemini will generate a high-engagement viral script storyboard.
          </p>

          <form onSubmit={handleGenerateScript} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="form-label">Topic or Niche Concept</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. 5 mysterious facts about the pyramids, or Daily motivational quote for programmers"
                required
                rows={3}
                className="input-control"
                style={{ resize: 'none' }}
              />
            </div>

            <div className="grid-two-col" style={{ gap: '16px' }}>
              <div>
                <label className="form-label">Script Style Tone</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="input-control input-control-select"
                >
                  <option value="informative">Factual & Informative</option>
                  <option value="mysterious">Mysterious & Dark</option>
                  <option value="motivational">Energetic & Inspiring</option>
                  <option value="humorous">Funny & Pop-culture</option>
                </select>
              </div>

              <div>
                <label className="form-label">Music Vibe</label>
                <select 
                  value={musicGenre}
                  onChange={(e) => setMusicGenre(e.target.value)}
                  className="input-control input-control-select"
                >
                  <option value="cinematic">Epic Cinematic</option>
                  <option value="upbeat">Upbeat & Energetic</option>
                  <option value="ambient">Calming Ambient</option>
                  <option value="dark">Dark Suspense</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <input 
                type="checkbox" 
                id="useVideos" 
                checked={useVideoAssets} 
                onChange={(e) => setUseVideoAssets(e.target.checked)} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-shorts)', cursor: 'pointer' }}
              />
              <label htmlFor="useVideos" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
                Search video clips instead of photos (Pexels API only)
              </label>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isGeneratingScript || !prompt.trim()}
              style={{ width: '100%', display: 'flex', gap: '8px', height: '46px', marginTop: '10px' }}
            >
              {isGeneratingScript ? (
                <span className="spinner"></span>
              ) : (
                <>
                  Generate AI Storyboard <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 2: STORYBOARD REVIEW ================= */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Review Script Storyboard</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Fine-tune the narrative text overlays and background stock image search terms.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {scenes.map((scene, idx) => (
              <div key={idx} className="glass-panel glass-panel-interactive" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '3px solid var(--color-cyan)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-cyan)', fontFamily: 'var(--font-display)' }}>Scene #{idx + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>Duration:</span>
                    <input 
                      type="number" 
                      value={scene.duration}
                      onChange={(e) => handleSceneTextChange(idx, 'duration', parseInt(e.target.value) || 5)}
                      className="input-control"
                      style={{
                        width: '44px',
                        padding: '4px 6px',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        borderRadius: '6px'
                      }}
                    />
                    <span>s</span>
                  </div>
                </div>
                
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Speech Narration & Subtitle</label>
                  <textarea 
                    value={scene.narratorText}
                    onChange={(e) => handleSceneTextChange(idx, 'narratorText', e.target.value)}
                    rows={3}
                    className="input-control"
                    style={{ resize: 'none', fontSize: '0.85rem', lineHeight: '1.4' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Stock Media Query</label>
                  <input 
                    type="text" 
                    value={scene.imageSearchQuery}
                    onChange={(e) => handleSceneTextChange(idx, 'imageSearchQuery', e.target.value)}
                    className="input-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifySelf: 'space-between', marginTop: '10px' }}>
            <button onClick={() => setCurrentStep(1)} className="btn btn-secondary" style={{ display: 'flex', gap: '6px' }}>
              <ArrowLeft size={18} /> Back
            </button>
            <button 
              onClick={handlePrepareAssetsAndTTS} 
              disabled={isGeneratingVoice}
              className="btn btn-primary" 
              style={{ display: 'flex', gap: '6px' }}
            >
              {isGeneratingVoice ? (
                <>
                  <RefreshCw className="spinner" size={18} /> Preparing Media...
                </>
              ) : (
                <>
                  Proceed to Video Player <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PREVIEW & COMPILE ================= */}
      {currentStep === 3 && (
        <div className="grid-sidebar-layout">
          {/* Left Column: Mobile Simulator */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PreviewPlayer 
              scenes={scenes} 
              musicGenre={musicGenre} 
              onCompileComplete={handleCompileFinished}
              onCompileStart={() => {
                setIsCompiling(true);
                setCompilePct(0);
              }}
              onCompileProgress={(pct) => setCompilePct(pct)}
            />
          </div>

          {/* Right Column: Actions / Instructions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {isCompiling ? (
              <div className="glass-panel pulse-recording" style={{ padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', borderLeft: '4px solid var(--color-shorts)' }}>
                <RefreshCw className="spinner" size={48} style={{ marginBottom: '20px', color: 'var(--color-shorts)', animationDuration: '2s' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Processing Video Canvas...</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '300px', marginBottom: '20px' }}>
                  Mixing audio tracks and generating frames. Compiling visual effects on your local device.
                </p>
                <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Rendering progress:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-shorts)' }}>{compilePct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${compilePct}%`, height: '100%', background: 'var(--color-shorts)', transition: 'width 0.1s ease' }}></div>
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '24px' }}>
                  * Please do not close or minimize this browser tab while compiling.
                </p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Compile & Export Short</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Play the video to verify the synchronization of titles, background images, and voice narration.
                </p>
                
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong style={{ color: '#fff' }}>How Exporting Works:</strong>
                  <ul style={{ paddingLeft: '14px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>We merge the background sliding images and high-fidelity text overlays.</li>
                    <li>We route speech elements and background score to record a standard WebM clip.</li>
                    <li>Clicking "Compile Video File" runs the automated canvas frames capture.</li>
                  </ul>
                </div>
              </div>
            )}

            {!isCompiling && (
              <div style={{ display: 'flex', justifySelf: 'flex-start', marginTop: 'auto' }}>
                <button onClick={() => setCurrentStep(2)} className="btn btn-secondary" style={{ display: 'flex', gap: '6px' }}>
                  <ArrowLeft size={18} /> Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= STEP 4: METADATA & UPLOAD ================= */}
      {currentStep === 4 && !uploadSuccessData && (
        <div className="grid-sidebar-layout">
          {/* Left Column: Compilation Details */}
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--color-success)',
              color: 'var(--color-success)'
            }}>
              <CheckCircle2 size={28} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Short Compiled Successfully</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Your video is rendered and saved in the browser cache.
              </p>
            </div>

            <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Video Duration:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{(scenes.reduce((sum, s) => sum + s.duration, 0))} seconds</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>File Size:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{(compiledVideoBlob?.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Format:</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>WebM (Shorts-ready 9:16)</span>
              </div>
            </div>

            {compiledVideoBlob && (
              <a 
                href={URL.createObjectURL(compiledVideoBlob)} 
                download={`${publishMetadata.title.slice(0, 15) || 'short'}.webm`}
                className="btn btn-outline"
                style={{ width: '100%', marginTop: '10px', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                Download Video File (.webm)
              </a>
            )}
          </div>

          {/* Right Column: Upload Metadata Form */}
          <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--color-shorts)', boxShadow: 'var(--shadow-glow)' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Metadata & Publish Settings</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: '1.4' }}>
              Customize details for search engine optimization before pushing directly to your connected YouTube channel.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="form-label">Short Title (Max 100 chars)</label>
                <input 
                  type="text" 
                  value={publishMetadata.title}
                  onChange={(e) => setPublishMetadata(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter YouTube Title"
                  className="input-control"
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea 
                  value={publishMetadata.description}
                  onChange={(e) => setPublishMetadata(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="input-control"
                  style={{ resize: 'none' }}
                />
              </div>

              {/* Schedule Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="scheduleCheck"
                  checked={publishMetadata.schedule}
                  onChange={(e) => setPublishMetadata(prev => ({ ...prev, schedule: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-shorts)', cursor: 'pointer' }}
                />
                <label htmlFor="scheduleCheck" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
                  Schedule video for later upload
                </label>
              </div>

              {publishMetadata.schedule && (
                <div>
                  <label className="form-label">Release Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={publishMetadata.scheduleTime}
                    onChange={(e) => setPublishMetadata(prev => ({ ...prev, scheduleTime: e.target.value }))}
                    className="input-control"
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '14px', marginTop: '30px' }}>
              <button 
                onClick={() => setCurrentStep(3)} 
                className="btn btn-secondary"
                disabled={isUploading}
                style={{ display: 'flex', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Back to Preview
              </button>
              
              <button 
                onClick={handleUploadVideo} 
                disabled={isUploading}
                className="btn btn-primary"
                style={{ flex: 1, height: '44px', display: 'flex', gap: '8px' }}
              >
                {isUploading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <UploadCloud size={18} /> {publishMetadata.schedule ? 'Schedule Upload' : 'Publish Short to YouTube'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 4: SUCCESS ================= */}
      {currentStep === 4 && uploadSuccessData && (
        <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            border: '2px solid var(--color-success)',
            color: 'var(--color-success)'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>
            {uploadSuccessData.status === 'scheduled' ? 'Short Queued Successfully!' : 'Short Uploaded!'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '30px', lineHeight: '1.5' }}>
            {uploadSuccessData.status === 'scheduled' ? (
              <>Your Short <strong>"{uploadSuccessData.title}"</strong> is scheduled for release on {new Date(publishMetadata.scheduleTime).toLocaleString()}. YouTube's servers will publish it automatically.</>
            ) : (
              <>Your Short <strong>"{uploadSuccessData.title}"</strong> is now live on YouTube! Viewers can watch it at the link below.</>
            )}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            {uploadSuccessData.youtubeUrl && (
              <a 
                href={uploadSuccessData.youtubeUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', gap: '8px' }}
              >
                Watch on YouTube <Globe size={16} />
              </a>
            )}
            
            <button 
              onClick={() => {
                setPrompt('');
                setCompiledVideoBlob(null);
                setUploadSuccessData(null);
                setCurrentStep(1);
              }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Create Another Short
            </button>
            
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="btn btn-outline"
              style={{ width: '100%', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

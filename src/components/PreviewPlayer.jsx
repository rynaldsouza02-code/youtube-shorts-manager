import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Film, CheckCircle, AlertCircle } from 'lucide-react';

export default function PreviewPlayer({ scenes, musicGenre, onCompileComplete, onCompileStart, onCompileProgress }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Compilation states
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [compileStatus, setCompileStatus] = useState(''); // '', 'done', 'error'


  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioDestRef = useRef(null);
  
  const speechAudioRef = useRef(null);
  const musicAudioRef = useRef(null);
  
  const animationFrameIdRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentSceneIdxRef = useRef(0);
  
  // Track timing
  const sceneStartTimeRef = useRef(0);
  const accumulatedTimeRef = useRef(0);

  // Background Music tracks (high-quality public royalty-free loops)
  const musicTracks = {
    cinematic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    upbeat: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    ambient: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    dark: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
  };

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0) * 1000; // ms

  // Load and cache all images & audios
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const imageElementsRef = useRef([]);

  useEffect(() => {
    // Reset state when scenes change
    setIsPlaying(false);
    setCurrentSceneIdx(0);
    setProgress(0);
    setCompileStatus('');
    setCompileProgress(0);
    setAssetsLoaded(false);
    
    // Stop any playing video elements to avoid memory leaks/background processes
    imageElementsRef.current.forEach(el => {
      if (el && el.tagName === 'VIDEO') {
        el.pause();
        el.src = '';
        el.load();
      }
    });
    imageElementsRef.current = [];

    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === scenes.length) {
        setAssetsLoaded(true);
        setTimeout(() => {
          drawStaticPreview();
        }, 50);
      }
    };

    // Pre-load images and videos
    scenes.forEach((scene, index) => {
      const isVideo = scene.assetType === 'video' || (scene.assetUrl && (scene.assetUrl.includes('.mp4') || scene.assetUrl.includes('video')));
      
      if (isVideo) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        video.loop = true;
        video.src = scene.assetUrl;
        
        video.onloadeddata = () => {
          imageElementsRef.current[index] = video;
          checkAllLoaded();
        };
        
        video.onerror = () => {
          console.warn(`Video failed to load for scene ${index + 1}. Using fallback image.`);
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 1080; fallbackCanvas.height = 1920;
          const fCtx = fallbackCanvas.getContext('2d');
          fCtx.fillStyle = '#1e293b'; fCtx.fillRect(0,0,1080,1920);
          
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            imageElementsRef.current[index] = fallbackImg;
            checkAllLoaded();
          };
          fallbackImg.onerror = () => {
            checkAllLoaded();
          };
          fallbackImg.src = fallbackCanvas.toDataURL();
        };
        video.load();
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = scene.assetUrl;
        
        img.onload = () => {
          imageElementsRef.current[index] = img;
          checkAllLoaded();
        };
        
        img.onerror = () => {
          console.warn(`Image failed to load for scene ${index + 1}. Using fallback image.`);
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = 1080; fallbackCanvas.height = 1920;
          const fCtx = fallbackCanvas.getContext('2d');
          fCtx.fillStyle = '#1e293b'; fCtx.fillRect(0,0,1080,1920);
          
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            imageElementsRef.current[index] = fallbackImg;
            checkAllLoaded();
          };
          fallbackImg.onerror = () => {
            checkAllLoaded();
          };
          fallbackImg.src = fallbackCanvas.toDataURL();
        };
      }
    });

    return () => {
      stopPlayback();
      imageElementsRef.current.forEach(el => {
        if (el && el.tagName === 'VIDEO') {
          el.pause();
          el.src = '';
          el.load();
        }
      });
    };
  }, [scenes]);

  const drawStaticPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imageElementsRef.current[0];
    if (img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Dark Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Title watermark
      ctx.font = '800 42px Outfit, sans-serif';
      ctx.fillStyle = '#ff2e55';
      ctx.textAlign = 'center';
      ctx.fillText('AutoShorts Editor', canvas.width/2, 200);
    }
  };

  const playSceneAsset = (index) => {
    imageElementsRef.current.forEach((el, idx) => {
      if (el && el.tagName === 'VIDEO') {
        el.pause();
        if (idx === index) {
          el.currentTime = 0;
          el.play().catch(e => console.log('Video play blocked:', e.message));
        }
      }
    });
  };

  const initAudio = () => {
    if (audioCtxRef.current) return;

    // Create browser Audio Context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioCtxRef.current = audioCtx;

    // Create recording destination node
    const dest = audioCtx.createMediaStreamDestination();
    audioDestRef.current = dest;

    // Create Speech element node
    const speech = new Audio();
    speech.crossOrigin = 'anonymous';
    const speechSource = audioCtx.createMediaElementSource(speech);
    speechSource.connect(audioCtx.destination);
    speechSource.connect(dest);
    speechAudioRef.current = speech;

    // Create Music element node
    const music = new Audio();
    music.crossOrigin = 'anonymous';
    music.loop = true;
    const musicSource = audioCtx.createMediaElementSource(music);
    
    // Add Volume Gain Node to keep background music low
    const musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.08; // 8% volume

    musicSource.connect(musicGain);
    musicGain.connect(audioCtx.destination);
    musicGain.connect(dest);
    musicAudioRef.current = music;
  };

  const startPlayback = async () => {
    initAudio();
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    sceneStartTimeRef.current = Date.now();
    accumulatedTimeRef.current = 0;
    currentSceneIdxRef.current = 0;
    setCurrentSceneIdx(0);

    // Play background music
    const genre = musicGenre || 'cinematic';
    musicAudioRef.current.src = musicTracks[genre];
    musicAudioRef.current.currentTime = 0;
    musicAudioRef.current.play().catch(e => console.log('Music blocked:', e.message));

    playSceneAudio(0);
    playSceneAsset(0);
    tick();
  };

  const playSceneAudio = (index) => {
    if (index >= scenes.length || !speechAudioRef.current) return;
    speechAudioRef.current.src = scenes[index].audioUrl;
    speechAudioRef.current.currentTime = 0;
    speechAudioRef.current.play().catch(e => console.log('Speech blocked:', e.message));
  };

  const stopPlayback = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
    }
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    // Pause all video assets
    imageElementsRef.current.forEach(el => {
      if (el && el.tagName === 'VIDEO') {
        el.pause();
      }
    });
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // The main rendering tick loop
  const tick = () => {
    if (!isPlayingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const elapsedSinceSceneStart = Date.now() - sceneStartTimeRef.current;
    const currentScene = scenes[currentSceneIdxRef.current];
    const sceneDuration = currentScene.duration * 1000;

    // Check if current scene has finished
    if (elapsedSinceSceneStart >= sceneDuration) {
      accumulatedTimeRef.current += sceneDuration;
      currentSceneIdxRef.current += 1;
      
      if (currentSceneIdxRef.current >= scenes.length) {
        // End of Short
        stopPlayback();
        setProgress(100);
        return;
      } else {
        // Next Scene
        setCurrentSceneIdx(currentSceneIdxRef.current);
        sceneStartTimeRef.current = Date.now();
        playSceneAudio(currentSceneIdxRef.current);
        playSceneAsset(currentSceneIdxRef.current);
      }
    }

    const currentSceneProgress = Math.min(elapsedSinceSceneStart / sceneDuration, 1);
    const overallProgress = ((accumulatedTimeRef.current + elapsedSinceSceneStart) / totalDuration) * 100;
    setProgress(overallProgress);

    // Draw frame
    drawFrame(ctx, canvas.width, canvas.height, currentSceneIdxRef.current, currentSceneProgress);

    animationFrameIdRef.current = requestAnimationFrame(tick);
  };

  // Draw a single frame to the canvas
  const drawFrame = (ctx, w, h, sceneIdx, progressVal) => {
    ctx.clearRect(0, 0, w, h);

    const img = imageElementsRef.current[sceneIdx];
    const scene = scenes[sceneIdx];

    // 1. Zoom/Pan Background Image (Ken Burns effect) or Video draw
    if (img) {
      const isVideo = img.tagName === 'VIDEO';
      const isReady = isVideo ? (img.readyState >= 2) : img.complete;
      
      if (isReady) {
        // Apply zoom to photos, but keep videos standard to avoid performance lag
        const zoom = isVideo ? 1.0 : (1.0 + (progressVal * 0.12)); 
        const drawW = w * zoom;
        const drawH = h * zoom;
        const drawX = (w - drawW) / 2;
        const drawY = (h - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      } else {
        // gradient fill fallback
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#111827');
        grad.addColorStop(1, '#1f2937');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
    } else {
      // gradient fill fallback
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#111827');
      grad.addColorStop(1, '#1f2937');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Dark Overlay for Contrast
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(0, 0, w, h);

    // 3. Subtitles highlight draw
    const words = scene.subtitleText.split(' ');
    const numWords = words.length;
    const activeWordIdx = Math.min(
      Math.floor(progressVal * numWords),
      numWords - 1
    );

    ctx.font = '800 64px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;

    // Word Wrap and Position
    const maxLineChars = 18;
    let currentLine = '';
    const lines = [];

    words.forEach((word, idx) => {
      const testLine = currentLine + word + ' ';
      if (testLine.length > maxLineChars && currentLine.length > 0) {
        lines.push({ text: currentLine.trim(), startIdx: idx - currentLine.split(' ').filter(Boolean).length });
        currentLine = word + ' ';
      } else {
        currentLine = testLine;
      }
    });
    lines.push({ text: currentLine.trim(), startIdx: words.length - currentLine.split(' ').filter(Boolean).length });

    const yStart = 1350; // render on lower third
    
    lines.forEach((lineObj, lIdx) => {
      const lineWords = lineObj.text.split(' ');
      const wordY = yStart + (lIdx * 90);
      
      // Calculate width to draw word by word
      let totalLineWidth = 0;
      lineWords.forEach((word) => {
        totalLineWidth += ctx.measureText(word.toUpperCase() + ' ').width;
      });

      let currentX = (w - totalLineWidth) / 2;

      lineWords.forEach((word, wIdx) => {
        const absoluteWordIdx = lineObj.startIdx + wIdx;
        const isActive = absoluteWordIdx === activeWordIdx;
        
        ctx.fillStyle = isActive ? '#ffeb3b' : '#ffffff'; // highlighted word is yellow
        
        const textToDraw = word.toUpperCase() + ' ';
        const textWidth = ctx.measureText(textToDraw).width;

        // Apply visual bounce to active word
        ctx.save();
        if (isActive) {
          ctx.translate(currentX + textWidth/2, wordY);
          ctx.scale(1.18, 1.18);
          ctx.strokeText(word.toUpperCase(), 0, 0);
          ctx.fillText(word.toUpperCase(), 0, 0);
        } else {
          ctx.strokeText(word.toUpperCase(), currentX + textWidth/2, wordY);
          ctx.fillText(word.toUpperCase(), currentX + textWidth/2, wordY);
        }
        ctx.restore();

        currentX += textWidth;
      });
    });
  };

  // Compile Canvas animation and Audios to WebM/MP4 using MediaRecorder
  const handleCompileShort = async () => {
    try {
      if (isCompiling) return;
      
      stopPlayback();
      initAudio();
      setIsCompiling(true);
      setCompileStatus('');
      setCompileProgress(0);
      
      if (onCompileStart) onCompileStart();
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const audioCtx = audioCtxRef.current;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Combine video stream (30 fps) and audio destination stream
      const videoStream = canvas.captureStream(30);
      const audioStream = audioDestRef.current.stream;

      const tracks = [
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ];

      const combinedStream = new MediaStream(tracks);
      
      // Dynamically detect supported mimeType for the browser
      let options = { videoBitsPerSecond: 4000000 };
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          options.mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          options.mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          options.mimeType = 'video/mp4';
        }
      }
      
      const recorder = new MediaRecorder(combinedStream, options);

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: options.mimeType || 'video/webm' });
        setIsCompiling(false);
        setCompileProgress(100);
        setCompileStatus('done');
        onCompileComplete(videoBlob);
      };

      // Set up variables for manual render loop
      let currentSceneIndex = 0;
      let sceneStartTime = Date.now();
      let accumulatedTime = 0;
      
      // Start media inputs
      recorder.start();

      // Play background music
      const genre = musicGenre || 'cinematic';
      musicAudioRef.current.src = musicTracks[genre];
      musicAudioRef.current.currentTime = 0;
      musicAudioRef.current.play().catch(e => console.log('Compile Audio block:', e));

      // Play first voice narration and video asset
      speechAudioRef.current.src = scenes[0].audioUrl;
      speechAudioRef.current.currentTime = 0;
      speechAudioRef.current.play().catch(e => console.log('Compile speech block:', e));
      playSceneAsset(0);

      setCompileStatus('Compiling video tracks...');

      // Precise interval loop for capturing frames (30 FPS)
      const intervalMs = 1000 / 30;
      const compileTimer = setInterval(() => {
        const elapsedSinceScene = Date.now() - sceneStartTime;
        const currentScene = scenes[currentSceneIndex];
        const sceneDuration = currentScene.duration * 1000;

        if (elapsedSinceScene >= sceneDuration) {
          accumulatedTime += sceneDuration;
          currentSceneIndex += 1;

          if (currentSceneIndex >= scenes.length) {
            // End compilation
            clearInterval(compileTimer);
            speechAudioRef.current.pause();
            musicAudioRef.current.pause();
            imageElementsRef.current.forEach(el => {
              if (el && el.tagName === 'VIDEO') el.pause();
            });
            recorder.stop(); // Triggers stop callback
            return;
          } else {
            // Next scene
            sceneStartTime = Date.now();
            speechAudioRef.current.src = scenes[currentSceneIndex].audioUrl;
            speechAudioRef.current.currentTime = 0;
            speechAudioRef.current.play().catch(e => console.log(e));
            playSceneAsset(currentSceneIndex);
          }
        }

        const sceneProgress = elapsedSinceScene / sceneDuration;
        const totalProgress = ((accumulatedTime + elapsedSinceScene) / totalDuration) * 100;
        const progressPct = Math.floor(totalProgress);
        setCompileProgress(progressPct);
        if (onCompileProgress) onCompileProgress(progressPct);

        // Draw frame to canvas
        drawFrame(ctx, canvas.width, canvas.height, currentSceneIndex, sceneProgress);
      }, intervalMs);

    } catch (error) {
      console.error('Canvas compilation failure:', error);
      imageElementsRef.current.forEach(el => {
        if (el && el.tagName === 'VIDEO') el.pause();
      });
      alert('Compilation error: ' + error.message);
      setCompileStatus('error');
      setIsCompiling(false);
      if (onCompileComplete) onCompileComplete(null); // Reset parent state
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      {/* 9:16 Vertical Simulator view */}
      <div className="shorts-simulator-container">
        <div className="shorts-phone-frame">
          <canvas 
            ref={canvasRef} 
            width={1080} 
            height={1920}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          
          {/* Asset loading spinner overlay */}
          {!assetsLoaded && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(12, 14, 20, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'var(--text-secondary)'
            }}>
              <div className="spinner" style={{ borderColor: 'var(--color-shorts)', borderTopColor: 'transparent', width: '28px', height: '28px' }}></div>
              <span style={{ fontSize: '0.85rem' }}>Loading Stock Media...</span>
            </div>
          )}

          {/* Subtitle preview container (purely overlay for editor visual comfort) */}
          {assetsLoaded && !isPlaying && !isCompiling && (
            <div className="subtitle-overlay-container">
              <div className="subtitle-word-box">
                <span className="active">Click Play To Preview</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress slider bar */}
      <div style={{ width: '330px' }}>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--color-shorts)',
            transition: isPlaying ? 'width 0.03s linear' : 'width 0.3s ease'
          }}></div>
        </div>
        <div style={{ display: 'flex', justifySelf: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Scene {currentSceneIdx + 1} of {scenes.length}</span>
          <span>{((totalDuration * (progress / 100)) / 1000).toFixed(1)}s / {(totalDuration / 1000).toFixed(0)}s</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '14px', width: '330px' }}>
        <button 
          onClick={handlePlayPause} 
          className="btn btn-secondary"
          disabled={isCompiling || !assetsLoaded}
          style={{ flex: 1, height: '44px' }}
        >
          {isPlaying ? (
            <>
              <Pause size={18} /> Pause Preview
            </>
          ) : (
            <>
              <Play size={18} /> Play Preview
            </>
          )}
        </button>

        <button 
          onClick={handleCompileShort} 
          className="btn btn-primary"
          disabled={isCompiling || isPlaying || !assetsLoaded}
          style={{ flex: 1.2, height: '44px', gap: '6px', backgroundColor: 'var(--color-success)' }}
        >
          <Film size={18} /> Compile Video File
        </button>
      </div>

      {/* Compile Progress Overlay Panel */}
      {isCompiling && (
        <div style={{
          width: '330px',
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(18, 20, 28, 0.95)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Encoding WebM Short...</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-success)' }}>{compileProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${compileProgress}%`, height: '100%', background: 'var(--color-success)' }}></div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{compileStatus}</span>
        </div>
      )}

      {/* Compile Finished Message */}
      {compileStatus === 'done' && (
        <div style={{
          width: '330px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--color-success)',
          fontSize: '0.85rem'
        }}>
          <CheckCircle size={16} /> Video compile completed! Ready to publish.
        </div>
      )}
    </div>
  );
}

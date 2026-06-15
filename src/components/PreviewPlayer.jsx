import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Film, CheckCircle, AlertCircle } from 'lucide-react';

export default function PreviewPlayer({ scenes, musicGenre, onCompileComplete, onCompileStart, onCompileProgress, aspectRatio = '9:16' }) {
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

  // Preloaded audio assets
  const audioObjectUrlsRef = useRef([]);
  const audioDurationsRef = useRef([]);

  // Background Music tracks (high-quality public royalty-free loops)
  const musicTracks = {
    cinematic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    upbeat: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    ambient: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    dark: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
  };

  const getSceneDuration = (idx) => {
    return (audioDurationsRef.current[idx] || scenes[idx]?.duration || 6) * 1000; // ms
  };

  const totalDuration = scenes.reduce((sum, s, idx) => sum + (audioDurationsRef.current[idx] || s.duration || 6), 0) * 1000; // ms

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

    // Revoke previous Object URLs to prevent memory leaks
    audioObjectUrlsRef.current.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    audioObjectUrlsRef.current = [];
    audioDurationsRef.current = [];

    let active = true;

    const preloadAssets = async () => {
      try {
        const promises = scenes.map(async (scene, index) => {
          // 1. Preload visual asset (image or video)
          const isVideo = scene.assetType === 'video' || (scene.assetUrl && (scene.assetUrl.includes('.mp4') || scene.assetUrl.includes('video')));
          
          let visualEl = null;
          if (isVideo) {
            visualEl = await new Promise((resolve) => {
              const video = document.createElement('video');
              video.crossOrigin = 'anonymous';
              video.muted = true;
              video.playsInline = true;
              video.loop = true;
              video.src = scene.assetUrl;
              
              video.onloadeddata = () => {
                resolve(video);
              };
              
              video.onerror = () => {
                console.warn(`Video failed to load for scene ${index + 1}. Using fallback image.`);
                resolve(null);
              };
              video.load();
            });
          } else {
            visualEl = await new Promise((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = scene.assetUrl;
              
              img.onload = () => {
                resolve(img);
              };
              
              img.onerror = () => {
                console.warn(`Image failed to load for scene ${index + 1}. Using fallback image.`);
                resolve(null);
              };
            });
          }

          // Generate fallback image if visual element failed
          if (!visualEl) {
            const fallbackCanvas = document.createElement('canvas');
            const isLandscape = aspectRatio === '16:9';
            fallbackCanvas.width = isLandscape ? 1920 : 1080;
            fallbackCanvas.height = isLandscape ? 1080 : 1920;
            const fCtx = fallbackCanvas.getContext('2d');
            fCtx.fillStyle = '#1e293b';
            fCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
            
            const fallbackImg = new Image();
            await new Promise((resolve) => {
              fallbackImg.onload = () => resolve();
              fallbackImg.onerror = () => resolve();
              fallbackImg.src = fallbackCanvas.toDataURL();
            });
            visualEl = fallbackImg;
          }

          if (active) {
            imageElementsRef.current[index] = visualEl;
          }

          // 2. Preload speech audio asset and fetch actual duration
          if (scene.audioUrl) {
            try {
              const res = await fetch(scene.audioUrl);
              if (!res.ok) throw new Error(`Fetch audio returned status ${res.status}`);
              const blob = await res.blob();
              const objectUrl = URL.createObjectURL(blob);
              
              const tempAudio = new Audio(objectUrl);
              const duration = await new Promise((resolve) => {
                tempAudio.onloadedmetadata = () => {
                  resolve(tempAudio.duration);
                };
                tempAudio.onerror = () => {
                  resolve(scene.duration || 6);
                };
                // Fallback timeout in case loading hangs
                setTimeout(() => resolve(scene.duration || 6), 2500);
              });

              if (active) {
                audioObjectUrlsRef.current[index] = objectUrl;
                audioDurationsRef.current[index] = duration || scene.duration || 6;
              }
            } catch (err) {
              console.warn(`Failed to preload audio for scene ${index + 1}:`, err.message);
              if (active) {
                audioObjectUrlsRef.current[index] = scene.audioUrl;
                audioDurationsRef.current[index] = scene.duration || 6;
              }
            }
          } else {
            if (active) {
              audioObjectUrlsRef.current[index] = null;
              audioDurationsRef.current[index] = scene.duration || 6;
            }
          }
        });

        await Promise.all(promises);

        if (active) {
          setAssetsLoaded(true);
          setTimeout(() => {
            drawStaticPreview();
          }, 50);
        }
      } catch (err) {
        console.error('Error preloading visual/audio assets:', err);
      }
    };

    preloadAssets();

    return () => {
      active = false;
      stopPlayback();
      imageElementsRef.current.forEach(el => {
        if (el && el.tagName === 'VIDEO') {
          el.pause();
          el.src = '';
          el.load();
        }
      });
      // Revoke created Object URLs on cleanup
      audioObjectUrlsRef.current.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [scenes, aspectRatio]);

  const drawStaticPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imageElementsRef.current[0];
    if (img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const imgW = img.videoWidth || img.naturalWidth || img.width || w;
      const imgH = img.videoHeight || img.naturalHeight || img.height || h;
      const canvasRatio = w / h;
      const imgRatio = imgW / imgH;
      
      let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH;
      if (imgRatio > canvasRatio) {
        sWidth = imgH * canvasRatio;
        sx = (imgW - sWidth) / 2;
      } else {
        sHeight = imgW / canvasRatio;
        sy = (imgH - sHeight) / 2;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, w, h);
      
      // Dark Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, w, h);
      // Title watermark
      const isLandscape = aspectRatio === '16:9';
      ctx.font = isLandscape ? '800 36px Outfit, sans-serif' : '800 42px Outfit, sans-serif';
      ctx.fillStyle = '#ff2e55';
      ctx.textAlign = 'center';
      ctx.fillText('AutoShorts Editor', w / 2, isLandscape ? 150 : 200);
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
    speechAudioRef.current.src = audioObjectUrlsRef.current[index] || scenes[index].audioUrl;
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
    const sceneDuration = getSceneDuration(currentSceneIdxRef.current);

    const hasAudioTrack = !!(audioObjectUrlsRef.current[currentSceneIdxRef.current] || scenes[currentSceneIdxRef.current]?.audioUrl);
    const hasAudio = hasAudioTrack && speechAudioRef.current;
    
    let isAudioPlaying = false;
    if (hasAudio) {
      const audioEl = speechAudioRef.current;
      if (audioEl.src && !audioEl.paused && !isNaN(audioEl.duration) && audioEl.currentTime > 0) {
        isAudioPlaying = true;
      }
    }

    let isSceneFinished = false;
    let currentSceneProgress = 0;

    if (hasAudio) {
      if (isAudioPlaying) {
        const audioEl = speechAudioRef.current;
        currentSceneProgress = Math.min(audioEl.currentTime / audioEl.duration, 1);
        isSceneFinished = audioEl.ended || (audioEl.currentTime >= audioEl.duration - 0.05);
      } else {
        currentSceneProgress = 0;
        if (elapsedSinceSceneStart > 4000) {
          isSceneFinished = true;
        } else {
          isSceneFinished = false;
        }
      }
    } else {
      currentSceneProgress = Math.min(elapsedSinceSceneStart / sceneDuration, 1);
      isSceneFinished = elapsedSinceSceneStart >= sceneDuration;
    }

    // Check if current scene has finished
    if (isSceneFinished) {
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

    const overallProgress = ((accumulatedTimeRef.current + (currentSceneProgress * sceneDuration)) / totalDuration) * 100;
    setProgress(Math.min(overallProgress, 100));

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
        // Center and cover-crop image/video to canvas aspect ratio
        const imgW = img.videoWidth || img.naturalWidth || img.width || w;
        const imgH = img.videoHeight || img.naturalHeight || img.height || h;
        const canvasRatio = w / h;
        const imgRatio = imgW / imgH;
        
        let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH;
        if (imgRatio > canvasRatio) {
          // Image is wider than canvas: crop sides
          sWidth = imgH * canvasRatio;
          sx = (imgW - sWidth) / 2;
        } else {
          // Image is taller than canvas: crop top and bottom
          sHeight = imgW / canvasRatio;
          sy = (imgH - sHeight) / 2;
        }

        // Apply zoom to photos, but keep videos standard to avoid performance lag
        const zoom = isVideo ? 1.0 : (1.0 + (progressVal * 0.12)); 
        if (zoom !== 1.0) {
          const newSWidth = sWidth / zoom;
          const newSHeight = sHeight / zoom;
          sx += (sWidth - newSWidth) / 2;
          sy += (sHeight - newSHeight) / 2;
          sWidth = newSWidth;
          sHeight = newSHeight;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, w, h);
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

    const isLandscape = aspectRatio === '16:9';
    ctx.font = isLandscape ? '800 42px Outfit, sans-serif' : '800 64px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = isLandscape ? 8 : 14;

    // Word Wrap and Position
    const maxLineChars = isLandscape ? 30 : 18;
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

    const yStart = isLandscape ? 780 : 1350; // render on lower third
    
    lines.forEach((lineObj, lIdx) => {
      const lineWords = lineObj.text.split(' ');
      const wordY = yStart + (lIdx * (isLandscape ? 70 : 90));
      
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
      setCompileStatus('Initializing audio tracks...');
      setCompileProgress(0);
      
      if (onCompileStart) onCompileStart();
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const audioCtx = audioCtxRef.current;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Preload background music into the element
      const genre = musicGenre || 'cinematic';
      musicAudioRef.current.src = musicTracks[genre];
      musicAudioRef.current.currentTime = 0;
      
      // Load first scene voice narration Object URL
      speechAudioRef.current.src = audioObjectUrlsRef.current[0] || scenes[0].audioUrl;
      speechAudioRef.current.currentTime = 0;

      // Wait for speech and background music audio elements to buffer (readyState >= 2)
      await Promise.all([
        new Promise((resolve) => {
          if (speechAudioRef.current.readyState >= 2) resolve();
          else {
            speechAudioRef.current.oncanplay = resolve;
            setTimeout(resolve, 2000); // Safety fallback
          }
        }),
        new Promise((resolve) => {
          if (musicAudioRef.current.readyState >= 2) resolve();
          else {
            musicAudioRef.current.oncanplay = resolve;
            setTimeout(resolve, 2000); // Safety fallback
          }
        })
      ]);

      // Combine video stream (30 fps) and audio destination stream
      const videoStream = canvas.captureStream(30);
      const audioStream = audioDestRef.current.stream;

      const tracks = [
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ];

      const combinedStream = new MediaStream(tracks);
      
      // Dynamically detect supported mimeType for the browser
      let options = { videoBitsPerSecond: 2000000 }; // 2 Mbps for size optimization (fits Vercel 4.5MB limit)
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
      
      // Start recording media inputs
      recorder.start();

      // Start audio playback
      musicAudioRef.current.play().catch(e => console.log('Compile Audio block:', e));
      speechAudioRef.current.play().catch(e => console.log('Compile speech block:', e));
      playSceneAsset(0);

      setCompileStatus('Compiling video tracks...');

      // Precise interval loop for capturing frames (30 FPS)
      const intervalMs = 1000 / 30;
      const compileTimer = setInterval(() => {
        const elapsedSinceScene = Date.now() - sceneStartTime;
        const sceneDuration = getSceneDuration(currentSceneIndex);

        const hasAudioTrack = !!(audioObjectUrlsRef.current[currentSceneIndex] || scenes[currentSceneIndex]?.audioUrl);
        const hasAudio = hasAudioTrack && speechAudioRef.current;

        let isAudioPlaying = false;
        if (hasAudio) {
          const audioEl = speechAudioRef.current;
          if (audioEl.src && !audioEl.paused && !isNaN(audioEl.duration) && audioEl.currentTime > 0) {
            isAudioPlaying = true;
          }
        }

        let isSceneFinished = false;
        let sceneProgress = 0;

        if (hasAudio) {
          if (isAudioPlaying) {
            const audioEl = speechAudioRef.current;
            sceneProgress = Math.min(audioEl.currentTime / audioEl.duration, 1);
            isSceneFinished = audioEl.ended || (audioEl.currentTime >= audioEl.duration - 0.05);
          } else {
            sceneProgress = 0;
            if (elapsedSinceScene > 4000) {
              isSceneFinished = true;
            } else {
              isSceneFinished = false;
            }
          }
        } else {
          sceneProgress = Math.min(elapsedSinceScene / sceneDuration, 1);
          isSceneFinished = elapsedSinceScene >= sceneDuration;
        }

        if (isSceneFinished) {
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
            speechAudioRef.current.src = audioObjectUrlsRef.current[currentSceneIndex] || scenes[currentSceneIndex].audioUrl;
            speechAudioRef.current.currentTime = 0;
            speechAudioRef.current.play().catch(e => console.log(e));
            playSceneAsset(currentSceneIndex);
          }
        }

        const totalProgress = ((accumulatedTime + (sceneProgress * sceneDuration)) / totalDuration) * 100;
        const progressPct = Math.floor(totalProgress);
        setCompileProgress(Math.min(progressPct, 99)); // Keep at 99% until file is fully packaged
        if (onCompileProgress) onCompileProgress(Math.min(progressPct, 99));

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

  const isLandscape = aspectRatio === '16:9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      {isLandscape ? (
        /* Landscape TV Simulator view */
        <div className="landscape-simulator-container">
          <div className="landscape-tv-frame">
            {/* TV Screen Reflection */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
              pointerEvents: 'none',
              zIndex: 15
            }} />

            <canvas 
              ref={canvasRef} 
              width={1920} 
              height={1080}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            
            {/* Asset loading spinner overlay */}
            {!assetsLoaded && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(12, 14, 20, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--text-secondary)',
                zIndex: 16
              }}>
                <div className="spinner" style={{ borderColor: 'var(--color-success)', borderTopColor: 'transparent', width: '28px', height: '28px' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading Stock Media...</span>
              </div>
            )}

            {/* Subtitle preview container */}
            {assetsLoaded && !isPlaying && !isCompiling && (
              <div className="subtitle-overlay-container" style={{ bottom: '20%' }}>
                <div className="subtitle-word-box">
                  <span className="active" style={{ fontSize: '1.2rem' }}>Click Play To Preview</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 9:16 Vertical Simulator view */
        <div className="shorts-simulator-container">
          <div className="shorts-phone-frame">
            {/* Physical camera notch overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '110px',
              height: '20px',
              background: '#1e2235',
              borderRadius: '0 0 14px 14px',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              pointerEvents: 'none'
            }}>
              {/* Camera lens */}
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#040508',
                border: '1px solid #3b4260'
              }} />
            </div>

            {/* Phone Status Bar Mockup */}
            <div style={{
              position: 'absolute',
              top: '4px',
              left: 0,
              right: 0,
              padding: '2px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              zIndex: 18,
              pointerEvents: 'none',
              fontFamily: 'var(--font-sans)'
            }}>
              <span>12:00</span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>5G</span>
                <div style={{ width: '15px', height: '8px', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '2px', padding: '1px', display: 'flex' }}>
                  <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.5)', borderRadius: '1px' }} />
                </div>
              </div>
            </div>

            {/* Glossy screen glare reflection */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.08) 100%)',
              pointerEvents: 'none',
              zIndex: 15
            }} />

            {/* Physical Home Indicator Bar */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90px',
              height: '4px',
              background: 'rgba(255,255,255,0.35)',
              borderRadius: '2px',
              zIndex: 18,
              pointerEvents: 'none'
            }} />

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
                background: 'rgba(12, 14, 20, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--text-secondary)',
                zIndex: 16
              }}>
                <div className="spinner" style={{ borderColor: 'var(--color-shorts)', borderTopColor: 'transparent', width: '28px', height: '28px' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading Stock Media...</span>
              </div>
            )}

            {/* Subtitle preview container */}
            {assetsLoaded && !isPlaying && !isCompiling && (
              <div className="subtitle-overlay-container">
                <div className="subtitle-word-box">
                  <span className="active">Click Play To Preview</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress slider bar */}
      <div style={{ width: isLandscape ? '560px' : '330px' }}>
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
            background: isLandscape ? 'var(--color-success)' : 'var(--color-shorts)',
            transition: isPlaying ? 'width 0.03s linear' : 'width 0.3s ease'
          }}></div>
        </div>
        <div style={{ display: 'flex', justifySelf: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Scene {currentSceneIdx + 1} of {scenes.length}</span>
          <span>{((totalDuration * (progress / 100)) / 1000).toFixed(1)}s / {(totalDuration / 1000).toFixed(0)}s</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '14px', width: isLandscape ? '560px' : '330px' }}>
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
          width: isLandscape ? '560px' : '330px',
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(18, 20, 28, 0.95)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifySelf: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Encoding WebM Video...</span>
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
          width: isLandscape ? '560px' : '330px',
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

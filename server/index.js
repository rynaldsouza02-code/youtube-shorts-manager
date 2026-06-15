import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { 
  getAuthUrl, 
  saveAuthTokens, 
  getChannelDetails, 
  uploadShortVideo,
  getLatestVideos
} from './youtube.js';
import { 
  generateScript, 
  generateSpeech, 
  searchStockAssets 
} from './generator.js';
import { 
  readDB, 
  writeDB, 
  getDBKey, 
  updateDBKey, 
  addUploadRecord, 
  updateUploadStatus 
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const TEMP_DIR = isVercel
  ? path.join('/tmp', 'temp')
  : path.join(__dirname, 'data', 'temp');

const app = express();
const PORT = process.env.PORT || 3001;

// Setup Middleware
app.use(cors());
app.use(express.json());
// Raw parser for binary video uploads up to 100MB
app.use('/api/upload-video', express.raw({ type: 'video/*', limit: '100mb' }));

// Ensure temp directory exists and serve files from it
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
app.use('/api/temp', express.static(TEMP_DIR));

// Serve production frontend if it exists
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Helper to clear temporary audio files on startup
function cleanTempDirectory() {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(TEMP_DIR, file));
    }
    console.log('Temporary assets cache cleaned.');
  } catch (err) {
    console.error('Error cleaning temp directory:', err.message);
  }
}
cleanTempDirectory();

// ================= AUTHENTICATION ENDPOINTS =================

// Initiate YouTube Authentication
app.get('/auth/youtube', (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OAuth Callback redirect handler
app.get('/auth/youtube/callback', async (req, res) => {
  const code = req.query.code;
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3001/auth/youtube/callback';
  const isLocalDev = redirectUri.includes('localhost');
  const redirectUrlBase = isLocalDev ? 'http://localhost:5173' : '';

  if (!code) {
    return res.redirect(`${redirectUrlBase}/settings?auth=error&reason=no_code`);
  }

  try {
    await saveAuthTokens(code);
    console.log('YouTube OAuth connection successful!');
    // Redirect user back to settings page on frontend
    res.redirect(`${redirectUrlBase}/settings?auth=success`);
  } catch (error) {
    console.error('OAuth Callback exchange failed:', error.message);
    res.redirect(`${redirectUrlBase}/settings?auth=error&reason=${encodeURIComponent(error.message)}`);
  }
});

// Check channel link state and fetch statistics
app.get('/api/youtube/channel', async (req, res) => {
  try {
    const channel = await getChannelDetails();
    res.json({ connected: true, channel });
  } catch (error) {
    res.json({ connected: false, reason: error.message });
  }
});

// Disconnect YouTube Channel
app.post('/api/youtube/disconnect', (req, res) => {
  try {
    updateDBKey('tokens', null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to retrieve active YouTube credentials/tokens for client local caching
app.get('/api/tokens', (req, res) => {
  try {
    const tokens = getDBKey('tokens');
    res.json({ tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to restore client local configurations to server temporary storage (essential for Vercel)
app.post('/api/sync', (req, res) => {
  try {
    const { settings, tokens, uploads } = req.body;
    const db = readDB();
    let updated = false;

    if (settings && Object.keys(settings).length > 0) {
      db.settings = { ...db.settings, ...settings };
      updated = true;
    }
    if (tokens) {
      db.tokens = tokens;
      updated = true;
    }
    if (uploads && Array.isArray(uploads) && uploads.length > 0) {
      // Restore history uploads that are missing
      if (!db.uploads) db.uploads = [];
      const existingIds = new Set(db.uploads.map(u => u.id));
      uploads.forEach(item => {
        if (item && item.id && !existingIds.has(item.id)) {
          db.uploads.push(item);
        }
      });
      // Sort uploads chronologically by creation time
      db.uploads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      updated = true;
    }

    if (updated) {
      writeDB(db);
    }
    res.json({ success: true, settings: db.settings, hasTokens: !!db.tokens });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= GENERATION ENDPOINTS =================

// Generate AI Storyboard Script
app.post('/api/generate/script', async (req, res) => {
  const { prompt, style, format } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const script = await generateScript(prompt, style, format);
    res.json(script);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate and Cache voiceover audio (TTS)
app.post('/api/generate/speech', async (req, res) => {
  const { text, filename } = req.body;
  if (!text || !filename) {
    return res.status(400).json({ error: 'Text and filename are required.' });
  }

  try {
    const audioUrl = await generateSpeech(text, filename);
    res.json({ audioUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search stock assets from Pexels API
app.get('/api/search/assets', async (req, res) => {
  const { query, type, orientation } = req.query; // type: photo or video
  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    const assets = await searchStockAssets(query, type || 'photo', orientation || 'portrait');
    res.json({ assets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= DATABASE ENDPOINTS =================

// Get Settings configuration
app.get('/api/settings', (req, res) => {
  const settings = getDBKey('settings');
  res.json(settings || {});
});

// Save Settings configuration
app.post('/api/settings', (req, res) => {
  const settings = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'Settings object is required.' });
  }

  try {
    updateDBKey('settings', settings);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch upload history (combining local database queue and real uploaded videos with live stats)
app.get('/api/uploads', async (req, res) => {
  let localUploads = getDBKey('uploads') || [];

  try {
    // Attempt to fetch latest uploaded videos directly from YouTube Data API
    const youtubeVideos = await getLatestVideos().catch((e) => {
      console.warn('Unable to query latest uploads from YouTube API:', e.message);
      return [];
    });

    if (youtubeVideos.length > 0) {
      const ytVideosMap = {};
      youtubeVideos.forEach(v => {
        ytVideosMap[v.videoId] = v;
      });

      const mergedList = [];
      const localVideoIds = new Set();

      localUploads.forEach(localItem => {
        if (localItem.videoId && ytVideosMap[localItem.videoId]) {
          const ytItem = ytVideosMap[localItem.videoId];
          localVideoIds.add(localItem.videoId);
          mergedList.push({
            ...localItem,
            views: ytItem.views,
            likes: ytItem.likes,
            comments: ytItem.comments,
            status: 'completed',
            youtubeUrl: ytItem.youtubeUrl || localItem.youtubeUrl
          });
        } else {
          if (localItem.videoId) {
            localVideoIds.add(localItem.videoId);
          }
          mergedList.push({
            ...localItem,
            views: localItem.views || 0
          });
        }
      });

      // Merge any uploads existing on the channel but not in local cache (uploaded outside the app)
      youtubeVideos.forEach(ytItem => {
        if (!localVideoIds.has(ytItem.videoId)) {
          mergedList.push({
            id: ytItem.videoId,
            videoId: ytItem.videoId,
            title: ytItem.title,
            createdAt: ytItem.publishedAt,
            status: 'completed',
            youtubeUrl: ytItem.youtubeUrl,
            views: ytItem.views,
            likes: ytItem.likes,
            comments: ytItem.comments,
            isExternal: true
          });
        }
      });

      // Sort by creation date descending
      mergedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(mergedList);
    }
  } catch (err) {
    console.warn('Fallback: YouTube integration failed. Loading local logs only.', err.message);
  }

  // Fallback: sort and return local cache uploads
  localUploads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(localUploads);
});

// Endpoint to handle raw video binary files and queue upload to YouTube
app.post('/api/upload-video', async (req, res) => {
  const safeDecode = (val) => {
    if (!val) return '';
    try {
      return decodeURIComponent(val);
    } catch (e) {
      return val;
    }
  };

  const videoTitle = safeDecode(req.headers['x-video-title']) || 'AI Short';
  const videoDesc = safeDecode(req.headers['x-video-desc']);
  const videoTags = safeDecode(req.headers['x-video-tags']);
  const videoCategory = req.headers['x-video-category'] || '22';
  const scheduleTime = req.headers['x-schedule-time'] || null; // ISO Date String

  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'Video binary body is empty.' });
  }

  const tempFilePath = path.join(TEMP_DIR, `compilation_${Date.now()}.webm`);
  
  try {
    // Write request raw binary buffer to a temp file
    fs.writeFileSync(tempFilePath, req.body);
    
    // Create database history record
    const record = addUploadRecord({
      title: videoTitle,
      description: videoDesc,
      tags: videoTags,
      scheduledAt: scheduleTime,
      status: 'processing'
    });

    if (scheduleTime) {
      // YouTube native scheduling (publishAt) requires video privacyStatus to be 'private'
      const uploadResult = await uploadShortVideo(tempFilePath, {
        title: videoTitle,
        description: videoDesc,
        tags: videoTags,
        categoryId: videoCategory,
        privacyStatus: 'private',
        publishAt: scheduleTime
      });

      updateUploadStatus(record.id, {
        status: 'scheduled',
        videoId: uploadResult.videoId,
        youtubeUrl: uploadResult.youtubeUrl
      });

      res.json({ success: true, record: { ...record, status: 'scheduled', ...uploadResult } });
    } else {
      // Publish immediately
      const uploadResult = await uploadShortVideo(tempFilePath, {
        title: videoTitle,
        description: videoDesc,
        tags: videoTags,
        categoryId: videoCategory,
        privacyStatus: 'public'
      });

      updateUploadStatus(record.id, {
        status: 'completed',
        videoId: uploadResult.videoId,
        youtubeUrl: uploadResult.youtubeUrl
      });

      res.json({ success: true, record: { ...record, status: 'completed', ...uploadResult } });
    }
  } catch (error) {
    console.error('Video process/upload error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    // Delete temp file after uploads finish
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (err) {
      console.error('Failed to delete temp video upload file:', err.message);
    }
  }
});

// Delete history upload item
app.delete('/api/uploads/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.uploads = db.uploads.filter(item => item.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// ================= BACKGROUND AUTOPILOT WORKER =================

let autopilotRunning = false;

// Trigger an automatic generation check
// Trigger an automatic generation check
async function runAutopilotCheck(force = false) {
  if (autopilotRunning) return { success: false, reason: 'Autopilot already running' };
  
  const db = readDB();
  const settings = db.settings;
  
  if (!settings || !settings.autopilot || (!settings.autopilot.enabled && !force)) {
    return { success: false, reason: 'Autopilot disabled' };
  }
  
  const tokens = db.tokens;
  if (!tokens) {
    console.log('[Autopilot] Skipped: YouTube channel not authenticated.');
    return { success: false, reason: 'YouTube channel not authenticated' };
  }

  const autopilot = settings.autopilot;
  const now = new Date();
  
  // Parse target schedule time (e.g. "12:00")
  const [targetHour, targetMin] = autopilot.time.split(':').map(Number);
  
  // Check if we should execute today
  const lastRunDate = autopilot.lastRun ? new Date(autopilot.lastRun) : null;
  const isDifferentDay = !lastRunDate || lastRunDate.toDateString() !== now.toDateString();
  const isPastTargetTime = now.getHours() > targetHour || (now.getHours() === targetHour && now.getMinutes() >= targetMin);

  if (force || (isDifferentDay && isPastTargetTime)) {
    autopilotRunning = true;
    console.log('[Autopilot] Triggered generation. Niche:', autopilot.niche);
    
    try {
      // 1. Generate script based on configured niche
      const script = await generateScript(`Generate an interesting fact video about: ${autopilot.niche}`);
      
      // 2. Add as a pending compilation upload in history
      const record = addUploadRecord({
        title: script.title,
        description: script.description,
        tags: script.tags,
        status: 'pending_compile', // Dashboard front-end detects and executes compile+upload in browser
        scriptData: script
      });
      
      console.log(`[Autopilot] Added script to compilation queue: "${script.title}". It will compile automatically on next dashboard view.`);
      
      // Update last run time to prevent infinite loops
      autopilot.lastRun = now.toISOString();
      settings.autopilot = autopilot;
      updateDBKey('settings', settings);
      return { success: true, record };
    } catch (err) {
      console.error('[Autopilot] Execution error:', err.message);
      throw err;
    } finally {
      autopilotRunning = false;
    }
  } else {
    return { success: false, reason: 'Not time yet today' };
  }
}

// Run autopilot check every 60 seconds
setInterval(() => {
  runAutopilotCheck().catch((err) => console.error('[Autopilot background check error]:', err.message));
}, 60 * 1000);

// API to trigger autopilot manually
app.post('/api/autopilot/trigger', async (req, res) => {
  try {
    const result = await runAutopilotCheck(true);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to reset autopilot lastRun status
app.post('/api/autopilot/reset', (req, res) => {
  try {
    const db = readDB();
    if (db.settings && db.settings.autopilot) {
      db.settings.autopilot.lastRun = null;
      writeDB(db);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Autopilot settings not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback serve for single page apps in prod (always return index.html)
app.get('*', (req, res) => {
  if (fs.existsSync(distPath)) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).send('Frontend build folder dist/ not found. Run "npm run build" or run client in dev mode.');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`YouTube Manager Express Server Running at: http://localhost:${PORT}`);
  console.log(`Vite Client Dev Server Available at: http://localhost:5173`);
  console.log(`======================================================\n`);
});

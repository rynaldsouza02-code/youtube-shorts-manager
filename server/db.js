import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const DB_PATH = isVercel
  ? path.join('/tmp', 'db.json')
  : path.join(__dirname, 'data', 'db.json');

// Initialize database with default structure if not exists
function initDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const defaultData = {
      settings: {
        youtubeClientId: '',
        youtubeClientSecret: '',
        pexelsApiKey: '',
        geminiApiKey: '',
        unsplashApiKey: '',
        huggingFaceApiKey: '',
        elevenLabsApiKey: '',
        elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
        mediaSource: 'pexels', // pexels, unsplash, huggingface
        ttsProvider: 'google', // google, elevenlabs
        defaultDescription: 'Created automatically using YouTube Manager!\n#shorts #ai #viral',
        defaultTags: 'shorts, ai, automated',
        defaultCategory: '22', // People & Blogs
        estimatedRPM: 3.0, // Default Shorts RPM is 3 Rupees per 1000 views
        estimatedCPM: 40.0, // Default CPM is 40 Rupees per 1000 impressions
        estimatedRPMShort: 3.0,
        estimatedCPMShort: 40.0,
        estimatedRPMLong: 150.0,
        estimatedCPMLong: 400.0,
        smtpHost: '',
        smtpPort: '587',
        smtpUser: '',
        smtpPass: '',
        smtpSecure: false,
        smtpSender: '',
        smtpRecipient: '',
        smtpNotificationsEnabled: false,
        autopilot: {
          enabled: false,
          niche: 'fun facts',
          frequency: 'daily',
          time: '12:00',
          lastRun: null
        },
        autopilotShort: {
          enabled: false,
          niche: 'fun facts',
          frequency: 'daily',
          time: '12:00',
          lastRun: null
        },
        autopilotLong: {
          enabled: false,
          niche: 'tech documentaries',
          frequency: 'daily',
          time: '18:00',
          lastRun: null
        }
      },
      tokens: null, // Stores OAuth tokens
      uploads: [], // List of upload history / schedules
      emailLogs: [] // Accountability logs of SMTP mail sent
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

// Read whole database
export function readDB() {
  initDB();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(raw);
    
    // Self-healing migration for split autopilot and monetization keys
    if (db.settings) {
      let updated = false;
      
      // Migrate old estimatedRPM / estimatedCPM to Short if Short keys are missing
      if (db.settings.estimatedRPMShort === undefined) {
        db.settings.estimatedRPMShort = db.settings.estimatedRPM !== undefined ? db.settings.estimatedRPM : 3.0;
        updated = true;
      }
      if (db.settings.estimatedCPMShort === undefined) {
        db.settings.estimatedCPMShort = db.settings.estimatedCPM !== undefined ? db.settings.estimatedCPM : 40.0;
        updated = true;
      }
      if (db.settings.estimatedRPMLong === undefined) {
        db.settings.estimatedRPMLong = 150.0;
        updated = true;
      }
      if (db.settings.estimatedCPMLong === undefined) {
        db.settings.estimatedCPMLong = 400.0;
        updated = true;
      }
      
      // Migrate old autopilot to autopilotShort if autopilotShort is missing
      if (!db.settings.autopilotShort) {
        db.settings.autopilotShort = db.settings.autopilot || {
          enabled: false,
          niche: 'fun facts',
          frequency: 'daily',
          time: '12:00',
          lastRun: null
        };
        updated = true;
      }
      // Initialize autopilotLong if missing
      if (!db.settings.autopilotLong) {
        db.settings.autopilotLong = {
          enabled: false,
          niche: 'tech documentaries',
          frequency: 'daily',
          time: '18:00',
          lastRun: null
        };
        updated = true;
      }

      // Initialize API providers settings if missing
      if (db.settings.unsplashApiKey === undefined) {
        db.settings.unsplashApiKey = '';
        updated = true;
      }
      if (db.settings.huggingFaceApiKey === undefined) {
        db.settings.huggingFaceApiKey = '';
        updated = true;
      }
      if (db.settings.elevenLabsApiKey === undefined) {
        db.settings.elevenLabsApiKey = '';
        updated = true;
      }
      if (db.settings.elevenLabsVoiceId === undefined) {
        db.settings.elevenLabsVoiceId = '21m00Tcm4TlvDq8ikWAM';
        updated = true;
      }
      if (db.settings.mediaSource === undefined) {
        db.settings.mediaSource = 'pexels';
        updated = true;
      }
      if (db.settings.ttsProvider === undefined) {
        db.settings.ttsProvider = 'google';
        updated = true;
      }
      
      // Initialize SMTP variables if missing
      if (db.settings.smtpHost === undefined) {
        db.settings.smtpHost = '';
        updated = true;
      }
      if (db.settings.smtpPort === undefined) {
        db.settings.smtpPort = '587';
        updated = true;
      }
      if (db.settings.smtpUser === undefined) {
        db.settings.smtpUser = '';
        updated = true;
      }
      if (db.settings.smtpPass === undefined) {
        db.settings.smtpPass = '';
        updated = true;
      }
      if (db.settings.smtpSecure === undefined) {
        db.settings.smtpSecure = false;
        updated = true;
      }
      if (db.settings.smtpSender === undefined) {
        db.settings.smtpSender = '';
        updated = true;
      }
      if (db.settings.smtpRecipient === undefined) {
        db.settings.smtpRecipient = '';
        updated = true;
      }
      if (db.settings.smtpNotificationsEnabled === undefined) {
        db.settings.smtpNotificationsEnabled = false;
        updated = true;
      }
      
      if (!db.emailLogs) {
        db.emailLogs = [];
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      }
    }
    
    return db;
  } catch (err) {
    console.error('Error reading local database:', err);
    return {};
  }
}

// Write whole database
export function writeDB(data) {
  initDB();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local database:', err);
    return false;
  }
}

// Helper: Get data by key
export function getDBKey(key) {
  const db = readDB();
  return db[key];
}

// Helper: Update data by key
export function updateDBKey(key, value) {
  const db = readDB();
  db[key] = value;
  return writeDB(db);
}

// Helper: Add upload record
export function addUploadRecord(record) {
  const db = readDB();
  if (!db.uploads) db.uploads = [];
  
  const newRecord = {
    id: 'vid_' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    status: 'pending', // pending, processing, completed, failed
    ...record
  };
  
  db.uploads.unshift(newRecord); // Add to beginning of history
  writeDB(db);
  return newRecord;
}

// Helper: Update upload status
export function updateUploadStatus(id, updates) {
  const db = readDB();
  db.uploads = db.uploads.map(item => {
    if (item.id === id) {
      return { ...item, ...updates, updatedAt: new Date().toISOString() };
    }
    return item;
  });
  writeDB(db);
}

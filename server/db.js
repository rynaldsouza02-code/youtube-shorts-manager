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
        defaultDescription: 'Created automatically using YouTube Manager!\n#shorts #ai #viral',
        defaultTags: 'shorts, ai, automated',
        defaultCategory: '22', // People & Blogs
        estimatedRPM: 3.0, // Default Shorts RPM is 3 Rupees per 1000 views
        estimatedCPM: 40.0, // Default CPM is 40 Rupees per 1000 impressions
        autopilot: {
          enabled: false,
          niche: 'fun facts',
          frequency: 'daily',
          time: '12:00',
          lastRun: null
        }
      },
      tokens: null, // Stores OAuth tokens
      uploads: [] // List of upload history / schedules
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

// Read whole database
export function readDB() {
  initDB();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
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

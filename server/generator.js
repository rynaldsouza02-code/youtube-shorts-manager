import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import googleTTS from 'google-tts-api';
import { getDBKey } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const TEMP_DIR = isVercel
  ? path.join('/tmp', 'temp')
  : path.join(__dirname, 'data', 'temp');

// Ensure temp directory exists for generated assets
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

// Generate structured script using Gemini API
export async function generateScript(topicPrompt, style) {
  const settings = getDBKey('settings');
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    // Return high quality offline fallback script
    console.log('Gemini API key missing. Generating mock script.');
    return generateMockScript(topicPrompt);
  }

  const systemPrompt = `You are a viral YouTube Shorts creator. Generate a highly engaging Short script about: "${topicPrompt}" with a style tone of "${style || 'informative'}".
You must output a JSON object matching this exact schema:
{
  "title": "Viral Title (include hashtags like #shorts)",
  "description": "An engaging SEO-optimized description with hashtags.",
  "tags": "comma, separated, tags, for, seo",
  "musicGenre": "cinematic | upbeat | ambient | dark",
  "scenes": [
    {
      "narratorText": "Narrator voiceover text. Keep it punchy, fast-paced, and highly engaging. Max 12 words per scene.",
      "subtitleText": "Clean subtitle overlay text, exactly matching narratorText.",
      "imageSearchQuery": "A specific search term for finding background stock images/videos (e.g. 'deep ocean dark shark', 'neon cyberpunk city street')",
      "duration": 6
    }
  ]
}
Generate exactly 10 scenes. Each scene must be exactly 6 seconds long, so the total duration is exactly 60 seconds (the maximum length for YouTube Shorts). Do not include markdown formatting or code fences (\`\`\`), just return the raw JSON string.`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let textContent = '';
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    try {
      console.log(`[Gemini] Attempting script generation with model: ${model}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        textContent = data.candidates[0].content.parts[0].text;
        console.log(`[Gemini] Success using model: ${model}`);
        break; // Successfully got response, exit loop
      } else {
        const errorText = await response.text();
        lastError = new Error(`Status ${response.status} - ${errorText}`);
        console.warn(`[Gemini] Model ${model} failed: ${lastError.message}`);
      }
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Model ${model} fetch failed: ${err.message}`);
    }
  }

  if (!textContent) {
    console.error('All Gemini models failed. Falling back to offline script. Last error:', lastError?.message);
    return generateMockScript(topicPrompt);
  }

  try {
    // Clean markdown code blocks if the AI wrapped the JSON
    textContent = textContent
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    
    // Parse the JSON output
    return JSON.parse(textContent);
  } catch (error) {
    console.error('Failed to parse Gemini JSON output, falling back:', error.message);
    return generateMockScript(topicPrompt);
  }
}


// Fetch voice narration using google-tts-api
export async function generateSpeech(text, filename) {
  ensureTempDir();
  const filePath = path.join(TEMP_DIR, `${filename}.mp3`);
  
  try {
    // Google Translate TTS allows maximum 200 characters
    const getAudioBase64 = googleTTS.getAudioBase64 || googleTTS.default?.getAudioBase64;
    
    if (text.length <= 200) {
      const base64 = await getAudioBase64(text, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
        timeout: 10000,
      });
      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      // Split text into smaller chunks and download
      const getAllAudioUrls = googleTTS.getAllAudioUrls || googleTTS.default?.getAllAudioUrls;
      const chunks = getAllAudioUrls(text, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com'
      });
      
      const buffers = [];
      for (const chunk of chunks) {
        const res = await fetch(chunk.url);
        if (!res.ok) throw new Error(`Failed to fetch TTS chunk: ${res.status}`);
        const buf = await res.arrayBuffer();
        buffers.push(Buffer.from(buf));
      }
      
      // Concatenate the MP3 chunks
      const combinedBuffer = Buffer.concat(buffers);
      fs.writeFileSync(filePath, combinedBuffer);
    }
    
    // Return relative URL path for the client
    return `/api/temp/${filename}.mp3`;
  } catch (error) {
    console.warn(`[TTS Warn] Speech generation failed for "${text.slice(0, 30)}...":`, error.message);
    console.log('[TTS Info] Falling back to a silent audio track for this scene.');
    try {
      // 1-second silent MP3 base64 string
      const silentBase64 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjEwMC4xMDAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaW5mbwAAAA8AAAACAAACQAB1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluaAAAAAwAAAAEAAACQAB1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1';
      fs.writeFileSync(filePath, Buffer.from(silentBase64, 'base64'));
      return `/api/temp/${filename}.mp3`;
    } catch (writeErr) {
      console.error('Failed to write fallback silent audio file:', writeErr.message);
      throw error;
    }
  }
}

// Fetch stock assets (videos/photos) from Pexels API
export async function searchStockAssets(query, type = 'photo') {
  const settings = getDBKey('settings');
  const apiKey = settings.pexelsApiKey;

  if (!apiKey) {
    console.log('Pexels API key missing. Returning mock visual placeholders.');
    return [];
  }

  // Use vertical (portrait) orientation for Shorts
  const baseUrl = type === 'video' 
    ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=3`
    : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=5`;

  try {
    const response = await fetch(baseUrl, {
      headers: { 'Authorization': apiKey }
    });

    if (!response.ok) {
      throw new Error(`Pexels API responded with status ${response.status}`);
    }

    const data = await response.json();
    
    if (type === 'video') {
      return data.videos.map(v => {
        // Find best portrait file quality (usually SD or HD)
        const bestFile = v.video_files.find(f => f.width >= 540 && f.width <= 1080) || v.video_files[0];
        return {
          id: v.id,
          type: 'video',
          src: bestFile.link,
          thumbnail: v.image,
          photographer: v.user.name
        };
      });
    } else {
      return data.photos.map(p => ({
        id: p.id,
        type: 'photo',
        src: p.src.large2x || p.src.large || p.src.medium,
        photographer: p.photographer
      }));
    }
  } catch (error) {
    console.error(`Pexels search failed for query "${query}":`, error.message);
    return [];
  }
}

// Mock script generator if Gemini is offline/unconfigured
function generateMockScript(prompt) {
  const cleanPrompt = prompt.replace(/[^\w\s]/gi, '').trim() || 'Amazing Discoveries';
  return {
    title: `10 Mind-Blowing Facts About ${cleanPrompt}! 🚀 #shorts`,
    description: `Prepare to be amazed! Here are 10 incredible facts about ${cleanPrompt} you probably never heard before!\n\n#shorts #ai #facts #education #${cleanPrompt.toLowerCase().replace(/\s+/g, '')}`,
    tags: `${cleanPrompt.toLowerCase()}, facts, secrets, educational, shorts, viral`,
    musicGenre: 'cinematic',
    scenes: [
      {
        narratorText: `Here are ten mind-blowing facts about ${cleanPrompt} that you need to know.`,
        subtitleText: `Ten mind-blowing facts about ${cleanPrompt} you must know.`,
        imageSearchQuery: `${cleanPrompt} mysterious epic universe galaxy`,
        duration: 6
      },
      {
        narratorText: "Fact number one. The sheer scale of this topic continues to baffle modern researchers.",
        subtitleText: "Fact 1. The scale continues to baffle researchers.",
        imageSearchQuery: `${cleanPrompt} massive space exploration stars`,
        duration: 6
      },
      {
        narratorText: "Fact number two. Hidden anomalies suggest there is more than meets the eye.",
        subtitleText: "Fact 2. Hidden anomalies suggest much more lies beneath.",
        imageSearchQuery: `${cleanPrompt} science secret analysis research`,
        duration: 6
      },
      {
        narratorText: "Fact number three. Ancient civilizations actually recorded observations about this long ago.",
        subtitleText: "Fact 3. Ancient civilizations observed this long ago.",
        imageSearchQuery: `ancient stone carving scroll history`,
        duration: 6
      },
      {
        narratorText: "Fact number four. Deep mathematical patterns govern its structural layout and composition.",
        subtitleText: "Fact 4. Mathematical patterns govern its structure.",
        imageSearchQuery: `abstract geometry numbers digital grid`,
        duration: 6
      },
      {
        narratorText: "Fact number five. Extreme temperatures or pressures alter its behavior in unique ways.",
        subtitleText: "Fact 5. Extreme environments change its behavior.",
        imageSearchQuery: `fire ice collision energy glow`,
        duration: 6
      },
      {
        narratorText: "Fact number six. Modern technology is finally allowing us to witness its true form.",
        subtitleText: "Fact 6. Technology finally reveals its true form.",
        imageSearchQuery: `microscope futuristic display holograph tech`,
        duration: 6
      },
      {
        narratorText: "Fact number seven. Many popular myths surrounding it have been debunked recently.",
        subtitleText: "Fact 7. Many popular myths have been debunked.",
        imageSearchQuery: `myth debunked symbol question mark glowing`,
        duration: 6
      },
      {
        narratorText: "Fact number eight. It plays a silent but crucial role in our global ecosystem.",
        subtitleText: "Fact 8. It plays a crucial role in our ecosystem.",
        imageSearchQuery: `nature forest green planet earth network`,
        duration: 6
      },
      {
        narratorText: "Fact number nine. The future of exploration here holds limitless possibilities.",
        subtitleText: "Fact 9. The future holds limitless possibilities.",
        imageSearchQuery: `future city neon flying spaceship speed`,
        duration: 6
      },
      {
        narratorText: "Fact number ten. Hit subscribe and drop your thoughts in the comments!",
        subtitleText: "Fact 10. Subscribe now and comment below!",
        imageSearchQuery: `subscribe channel notifications smartphone click`,
        duration: 6
      }
    ]
  };
}

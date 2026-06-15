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
export async function generateScript(topicPrompt, style, format = 'short') {
  const settings = getDBKey('settings');
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    // Return high quality offline fallback script
    console.log('Gemini API key missing. Generating mock script.');
    return format === 'long' ? generateMockScriptLong(topicPrompt) : generateMockScript(topicPrompt);
  }

  const systemPrompt = format === 'long'
    ? `You are a viral YouTube video creator. Generate a highly engaging, detailed long-form video script about: "${topicPrompt}" with a style tone of "${style || 'informative'}".
You must output a JSON object matching this exact schema:
{
  "title": "Viral YouTube Video Title",
  "description": "An engaging, SEO-optimized description with video chapters and relevant hashtags.",
  "tags": "comma, separated, tags, for, seo, long, form",
  "musicGenre": "cinematic | upbeat | ambient | dark",
  "scenes": [
    {
      "narratorText": "Detailed narrator voiceover text. Keep it highly engaging, flowy, and natural. Max 25 words per scene.",
      "subtitleText": "Clean subtitle overlay text, exactly matching narratorText.",
      "imageSearchQuery": "A specific search term for finding background stock landscape images/videos (e.g. 'deep ocean dark shark', 'neon cyberpunk city street')",
      "duration": 8
    }
  ]
}
Generate exactly 15 scenes. Each scene must be exactly 8 seconds long, so the total duration is exactly 120 seconds (2 minutes). Do not include markdown formatting or code fences (\`\`\`), just return the raw JSON string.`
    : `You are a viral YouTube Shorts creator. Generate a highly engaging Short script about: "${topicPrompt}" with a style tone of "${style || 'informative'}".
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
    return format === 'long' ? generateMockScriptLong(topicPrompt) : generateMockScript(topicPrompt);
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
    return format === 'long' ? generateMockScriptLong(topicPrompt) : generateMockScript(topicPrompt);
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
export async function searchStockAssets(query, type = 'photo', orientation = 'portrait') {
  const settings = getDBKey('settings');
  const apiKey = settings.pexelsApiKey;

  if (!apiKey) {
    console.log('Pexels API key missing. Returning mock visual placeholders.');
    return [];
  }

  // Query landscape or portrait files based on orientation parameter
  const baseUrl = type === 'video' 
    ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=3`
    : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5`;

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
        // Find best file quality (landscape HD vs portrait SD/HD)
        const bestFile = orientation === 'landscape'
          ? (v.video_files.find(f => f.width >= 1280 && f.width <= 1920) || v.video_files[0])
          : (v.video_files.find(f => f.width >= 540 && f.width <= 1080) || v.video_files[0]);
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

// Mock long-form script generator
function generateMockScriptLong(prompt) {
  const cleanPrompt = prompt.replace(/[^\w\s]/gi, '').trim() || 'Modern Technology';
  return {
    title: `The Untold History of ${cleanPrompt} - A Complete Documentary! 🎥`,
    description: `A deep-dive investigation into the evolution, secrets, and future impact of ${cleanPrompt}.\n\nTimestamps:\n0:00 Introduction\n0:30 Core Evolution\n1:00 Hidden Anomalies\n1:30 Future Projections\n\n#education #documentary #science #${cleanPrompt.toLowerCase().replace(/\s+/g, '')}`,
    tags: `${cleanPrompt.toLowerCase()}, documentary, history, science, explanation, deep dive`,
    musicGenre: 'cinematic',
    scenes: [
      {
        narratorText: `Welcome to this deep dive into the history, secrets, and evolution of ${cleanPrompt}. We start from the early beginnings.`,
        subtitleText: `Welcome to this deep dive into ${cleanPrompt}. We start from the beginning.`,
        imageSearchQuery: `${cleanPrompt} history start genesis universe`,
        duration: 8
      },
      {
        narratorText: "In the initial phases, researchers struggled to grasp the core concepts of this emerging paradigm.",
        subtitleText: "In initial phases, researchers struggled to grasp core concepts.",
        imageSearchQuery: `scientific equation blackboard physics thinking scientist`,
        duration: 8
      },
      {
        narratorText: "Hidden anomalies and archaeological records suggest that ancient cultures observed similar patterns.",
        subtitleText: "Hidden records suggest ancient cultures observed similar patterns.",
        imageSearchQuery: `ancient Egyptian hieroglyphs stone temple ruins`,
        duration: 8
      },
      {
        narratorText: "By the turn of the century, industrial advancements accelerated the scale and complexity of this field.",
        subtitleText: "Industrial advancements accelerated complexity of this field.",
        imageSearchQuery: `industrial machinery steam gear cog outline vintage factory`,
        duration: 8
      },
      {
        narratorText: "Mathematical models show a structured geometric pattern governing the internal dynamics.",
        subtitleText: "Mathematical models show structured geometric patterns.",
        imageSearchQuery: `geometric vector matrix blue digital grid glow lines`,
        duration: 8
      },
      {
        narratorText: "Under high-stress laboratory environments, the substance exhibits extreme state alterations.",
        subtitleText: "Under stress, the substance exhibits extreme state alterations.",
        imageSearchQuery: `physics laboratory electric laser spark fusion experiment`,
        duration: 8
      },
      {
        narratorText: "Global distributions reveal that it plays a quiet but absolutely essential role in ecosystem stabilization.",
        subtitleText: "Global distributions reveal its essential role in ecosystem stabilization.",
        imageSearchQuery: `satellite view green planet earth space blue atmosphere`,
        duration: 8
      },
      {
        narratorText: "Critics argue that early myths still cloud our contemporary understanding of its actual impact.",
        subtitleText: "Critics argue early myths still cloud our understanding.",
        imageSearchQuery: `greek statue outline broken query mark fog backdrop`,
        duration: 8
      },
      {
        narratorText: "Recent technological innovations have finally unlocked the path to visualize its microstructures.",
        subtitleText: "Recent tech has unlocked the path to visualize microstructures.",
        imageSearchQuery: `powerful electron microscope screen displaying atom grid`,
        duration: 8
      },
      {
        narratorText: "The economic implications are massive, attracting billions in funding from global conglomerates.",
        subtitleText: "The economic implications attract billions in global funding.",
        imageSearchQuery: `stock exchange market bull chart graph skyscraper skyline`,
        duration: 8
      },
      {
        narratorText: "However, regulatory hurdles and ethical concerns have slowed down the public rollout.",
        subtitleText: "However, regulatory hurdles and ethical concerns slow public rollout.",
        imageSearchQuery: `court gavel paper scale justice scales lawyer defense`,
        duration: 8
      },
      {
        narratorText: "We interviewed leading experts who believe that the breakthroughs are just around the corner.",
        subtitleText: "Experts believe breakthroughs are just around the corner.",
        imageSearchQuery: `corporate meeting room board presentation interview panel`,
        duration: 8
      },
      {
        narratorText: "What remains to be seen is how this will redefine our lifestyle in the next few decades.",
        subtitleText: "It remains to see how this redefines lifestyle in coming decades.",
        imageSearchQuery: `smart house assistant robot helping family room futuristic`,
        duration: 8
      },
      {
        narratorText: "One thing is certain. The landscape of exploration here is permanently transformed.",
        subtitleText: "One thing is certain. The exploration landscape is transformed.",
        imageSearchQuery: `beautiful sunrise valley mountain peak horizon epic view`,
        duration: 8
      },
      {
        narratorText: "If you enjoyed this documentary, hit subscribe and share your thoughts in the comments section below.",
        subtitleText: "If you enjoyed this, hit subscribe and comment below.",
        imageSearchQuery: `widescreen display showing subscribe icon clicking cursor`,
        duration: 8
      }
    ]
  };
}

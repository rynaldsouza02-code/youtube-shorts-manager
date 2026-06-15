import { google } from 'googleapis';
import fs from 'fs';
import { getDBKey, updateDBKey } from './db.js';

// Dynamically generate OAuth2 client using settings stored in the database
export function getOAuth2Client() {
  const settings = getDBKey('settings');
  
  if (!settings || !settings.youtubeClientId || !settings.youtubeClientSecret) {
    throw new Error('Google OAuth Client ID and Client Secret are not configured in Settings.');
  }

  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3001/auth/youtube/callback';

  // We redirect back to our local Express redirect handler
  return new google.auth.OAuth2(
    settings.youtubeClientId,
    settings.youtubeClientSecret,
    redirectUri
  );
}

// Generate the authentication URL
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // crucial to receive a refresh token
    scope: scopes,
    prompt: 'consent' // force consent screen to always get refresh token
  });
}

// Exchange auth code for tokens
export async function saveAuthTokens(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  // Save tokens in database
  updateDBKey('tokens', tokens);
  return tokens;
}

// Get authenticated client ready for requests
export async function getAuthenticatedClient() {
  const oauth2Client = getOAuth2Client();
  const tokens = getDBKey('tokens');

  if (!tokens) {
    throw new Error('YouTube channel is not authenticated. Please log in.');
  }

  oauth2Client.setCredentials(tokens);

  // Monitor token refreshes and save new tokens
  oauth2Client.on('tokens', (newTokens) => {
    console.log('YouTube access token refreshed automatically.');
    const currentTokens = getDBKey('tokens') || {};
    updateDBKey('tokens', {
      ...currentTokens,
      ...newTokens
    });
  });

  return oauth2Client;
}

// Get Channel Name, Subscriber Count and Avatar
export async function getChannelDetails() {
  try {
    const authClient = await getAuthenticatedClient();
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    const response = await youtube.channels.list({
      part: 'snippet,statistics',
      mine: true
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('No YouTube channel found for the authenticated user.');
    }

    const channel = response.data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      customUrl: channel.snippet.customUrl || '',
      avatar: channel.snippet.thumbnails.default.url,
      subscribers: channel.statistics.subscriberCount,
      views: channel.statistics.viewCount,
      videoCount: channel.statistics.videoCount
    };
  } catch (error) {
    console.error('Error fetching channel details:', error.message);
    throw error;
  }
}

// Upload a video file to YouTube
export async function uploadShortVideo(filePath, metadata) {
  try {
    const authClient = await getAuthenticatedClient();
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found at path: ${filePath}`);
    }

    // Standardize title for Shorts (make sure #shorts is included)
    let title = metadata.title || 'AI Generated Short';
    if (!title.toLowerCase().includes('#shorts')) {
      title = `${title.slice(0, 80)} #shorts`; // ensure fits title limit (100)
    }

    const fileSize = fs.statSync(filePath).size;
    console.log(`Uploading video to YouTube. Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB. Title: "${title}"`);

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: title,
          description: metadata.description || 'Uploaded via YouTube Manager!',
          tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : ['shorts', 'ai'],
          categoryId: metadata.categoryId || '22', // default People & Blogs
          defaultLanguage: 'en'
        },
        status: {
          privacyStatus: metadata.privacyStatus || 'public', // public, private, unlisted
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: fs.createReadStream(filePath)
      }
    }, {
      // Set timeout/chunk settings for reliable upload
      onUploadProgress: (evt) => {
        const progress = (evt.bytesRead / fileSize) * 100;
        console.log(`Upload progress: ${progress.toFixed(2)}%`);
      }
    });

    console.log('Video uploaded successfully! Video ID:', response.data.id);
    return {
      videoId: response.data.id,
      youtubeUrl: `https://youtube.com/shorts/${response.data.id}`,
      title: response.data.snippet.title,
      status: 'completed'
    };
  } catch (error) {
    console.error('Error uploading video to YouTube:', error.message);
    throw error;
  }
}

// Fetch latest uploaded videos directly from the YouTube channel
export async function getLatestVideos() {
  try {
    const authClient = await getAuthenticatedClient();
    const youtube = google.youtube({ version: 'v3', auth: authClient });

    // 1. Get contentDetails to find the uploaded videos playlist ID
    const channelResponse = await youtube.channels.list({
      part: 'contentDetails',
      mine: true
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('No YouTube channel details found.');
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return [];
    }

    // 2. Fetch latest playlist items
    const playlistResponse = await youtube.playlistItems.list({
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 20
    });

    const items = playlistResponse.data.items || [];
    if (items.length === 0) {
      return [];
    }

    const videoIds = items.map(item => item.snippet.resourceId.videoId);

    // 3. Fetch full statistics and privacy status for these video IDs
    const videosResponse = await youtube.videos.list({
      part: 'statistics,snippet,status',
      id: videoIds.join(',')
    });

    const videoDetailsMap = {};
    (videosResponse.data.items || []).forEach(v => {
      videoDetailsMap[v.id] = v;
    });

    // 4. Map and return items sorted by published date
    return items.map(item => {
      const videoId = item.snippet.resourceId.videoId;
      const details = videoDetailsMap[videoId];
      return {
        id: videoId,
        videoId: videoId,
        title: item.snippet?.title || details?.snippet?.title || 'YouTube Short',
        description: item.snippet?.description || '',
        publishedAt: item.snippet?.publishedAt || details?.snippet?.publishedAt || new Date().toISOString(),
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        views: details ? parseInt(details.statistics?.viewCount || 0) : 0,
        likes: details ? parseInt(details.statistics?.likeCount || 0) : 0,
        comments: details ? parseInt(details.statistics?.commentCount || 0) : 0,
        youtubeUrl: `https://youtube.com/shorts/${videoId}`,
        status: details?.status?.privacyStatus || 'public'
      };
    });
  } catch (error) {
    console.error('Error fetching latest videos from YouTube API:', error.message);
    throw error;
  }
}

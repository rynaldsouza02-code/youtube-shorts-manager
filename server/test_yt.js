import { getLatestVideos, getChannelDetails } from './youtube.js';

async function test() {
  try {
    console.log('--- Testing Channel Details ---');
    const channel = await getChannelDetails();
    console.log('Channel details:', JSON.stringify(channel, null, 2));

    console.log('\n--- Testing Latest Videos from YouTube API ---');
    const videos = await getLatestVideos();
    console.log(`Found ${videos.length} videos:`);
    console.log(JSON.stringify(videos, null, 2));
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

test();

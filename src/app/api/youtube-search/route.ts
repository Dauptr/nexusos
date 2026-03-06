import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  publishedAt: string;
  description: string;
  url: string;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function searchVideos(query: string, page: number) {
  const zai = await ZAI.create();
  const videos: YouTubeVideo[] = [];
  const seenIds = new Set<string>();

  // Multiple search queries to get more results
  const searchQueries = [
    `${query} site:youtube.com`,
    `"${query}" official video site:youtube.com`,
    `${query} music video site:youtube.com`,
  ];

  for (const searchQuery of searchQueries) {
    try {
      const results = await zai.functions.invoke('web_search', {
        query: searchQuery,
        num: 15,
      });

      if (Array.isArray(results)) {
        for (const item of results) {
          const videoId = extractVideoId(item.url);
          if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            videos.push({
              id: videoId,
              title: item.name || 'Video',
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              channel: item.host_name || 'YouTube',
              publishedAt: item.date || '',
              description: (item.snippet || '').substring(0, 200),
              url: item.url,
            });
          }
        }
      }
    } catch (e) {
      console.error('Search query failed:', searchQuery, e);
    }
  }

  console.log(`[YouTube] Found ${videos.length} unique videos for "${query}"`);

  // Pagination
  const pageSize = 8;
  const startIndex = (page - 1) * pageSize;

  return {
    success: true,
    videos: videos.slice(startIndex, startIndex + pageSize),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(videos.length / pageSize),
      totalResults: videos.length,
      hasMore: startIndex + pageSize < videos.length,
      pageSize,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, page = 1 } = body;
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });
    
    const result = await searchVideos(query, page);
    return NextResponse.json(result);
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    
    if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });
    
    const result = await searchVideos(query, page);
    return NextResponse.json(result);
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

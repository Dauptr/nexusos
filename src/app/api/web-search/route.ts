import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

// POST - Perform web search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, num = 10 } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('[Web Search API] Searching for:', query)

    const zai = await ZAI.create()

    // Use web search from Z-AI SDK
    const results = await zai.functions.invoke('web_search', {
      query,
      num
    })

    console.log('[Web Search API] Results:', JSON.stringify(results, null, 2).substring(0, 500))

    // Handle different response formats
    if (Array.isArray(results)) {
      return NextResponse.json({
        success: true,
        results: results.map((r: { url?: string; name?: string; snippet?: string; title?: string; host_name?: string }) => ({
          title: r.name || r.title || '',
          url: r.url || '',
          snippet: r.snippet || '',
          source: r.host_name || ''
        }))
      })
    }

    if (results?.results && Array.isArray(results.results)) {
      return NextResponse.json({
        success: true,
        results: results.results.map((r: { url?: string; name?: string; snippet?: string; title?: string }) => ({
          title: r.name || r.title || '',
          url: r.url || '',
          snippet: r.snippet || ''
        }))
      })
    }

    return NextResponse.json({
      success: true,
      results: []
    })

  } catch (error: unknown) {
    console.error('[Web Search API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    )
  }
}

// GET - Quick search via query param
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const num = parseInt(searchParams.get('num') || '10')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter q is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    const results = await zai.functions.invoke('web_search', {
      query,
      num
    })

    if (Array.isArray(results)) {
      return NextResponse.json({
        success: true,
        results: results.map((r: { url?: string; name?: string; snippet?: string; title?: string }) => ({
          title: r.name || r.title || '',
          url: r.url || '',
          snippet: r.snippet || ''
        }))
      })
    }

    return NextResponse.json({
      success: true,
      results: []
    })

  } catch (error: unknown) {
    console.error('[Web Search API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    )
  }
}

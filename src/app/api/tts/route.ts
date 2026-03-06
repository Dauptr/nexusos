import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

// POST - Generate speech from text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice = 'alloy' } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('[TTS API] Generating speech for text:', text.substring(0, 50))
    console.log('[TTS API] Voice:', voice)

    const zai = await ZAI.create()

    // Use TTS from Z-AI SDK
    const result = await zai.tts.create({
      text,
      voice
    })

    console.log('[TTS API] Result type:', typeof result)

    // Handle different response formats
    if (result.audioUrl) {
      return NextResponse.json({
        success: true,
        audioUrl: result.audioUrl
      })
    }

    if (result.audio) {
      return NextResponse.json({
        success: true,
        audioUrl: result.audio
      })
    }

    if (result.base64) {
      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/mp3;base64,${result.base64}`
      })
    }

    if (result.data?.[0]?.url) {
      return NextResponse.json({
        success: true,
        audioUrl: result.data[0].url
      })
    }

    // If result is a string URL directly
    if (typeof result === 'string') {
      return NextResponse.json({
        success: true,
        audioUrl: result.startsWith('data:') ? result : `data:audio/mp3;base64,${result}`
      })
    }

    return NextResponse.json(
      { error: 'No audio generated', result: JSON.stringify(result) },
      { status: 500 }
    )

  } catch (error: unknown) {
    console.error('[TTS API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

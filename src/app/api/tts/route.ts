import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

// POST - Generate speech from text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice = 'tongtong', speed = 1.0, format = 'wav' } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('[TTS API] Generating speech for text:', text.substring(0, 50))
    console.log('[TTS API] Voice:', voice)

    const zai = await ZAI.create()

    // Use TTS from Z-AI SDK - returns Response object with audio data
    const response = await zai.audio.tts.create({
      input: text,
      voice,
      speed,
      response_format: format,
      stream: false
    })

    console.log('[TTS API] Response type:', typeof response)

    // The response is a Response object with audio data
    if (response && response.arrayBuffer) {
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))
      const base64 = buffer.toString('base64')
      
      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/${format};base64,${base64}`,
        format: format
      })
    }

    return NextResponse.json(
      { error: 'No audio generated' },
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

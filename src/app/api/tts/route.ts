import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, voice = 'alloy' } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Text is required'
      }, { status: 400 })
    }

    // Validate voice
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    const selectedVoice = validVoices.includes(voice) ? voice : 'alloy'

    const zai = await ZAI.create()

    // Generate TTS using z-ai-web-dev-sdk
    const response = await zai.audio.tts.create({
      text: text,
      voice: selectedVoice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
    })

    // Check for audio data in response
    if (response.data && response.data[0]?.base64) {
      const base64Audio = response.data[0].base64
      
      // Save the audio file
      const fileName = `tts-${Date.now()}.mp3`
      const filePath = path.join(process.cwd(), 'public', fileName)
      
      const buffer = Buffer.from(base64Audio, 'base64')
      await fs.writeFile(filePath, buffer)
      
      return NextResponse.json({
        success: true,
        audioUrl: `/${fileName}`,
        voice: selectedVoice
      })
    }

    // If audio URL is returned directly
    if (response.data && response.data[0]?.url) {
      const audioUrl = response.data[0].url
      
      // Download and save locally
      try {
        const audioResponse = await fetch(audioUrl)
        const arrayBuffer = await audioResponse.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        const fileName = `tts-${Date.now()}.mp3`
        const filePath = path.join(process.cwd(), 'public', fileName)
        await fs.writeFile(filePath, buffer)
        
        return NextResponse.json({
          success: true,
          audioUrl: `/${fileName}`,
          voice: selectedVoice
        })
      } catch {
        // Return original URL if saving fails
        return NextResponse.json({
          success: true,
          audioUrl: audioUrl,
          voice: selectedVoice
        })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'No audio generated'
    })

  } catch (error) {
    console.error('TTS generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'TTS generation failed'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'TTS API ready',
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  })
}

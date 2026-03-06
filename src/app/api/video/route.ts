import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

// POST - Generate video from text or image
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, imageUrl } = body

    if (!prompt && !imageUrl) {
      return NextResponse.json(
        { error: 'Prompt or imageUrl is required' },
        { status: 400 }
      )
    }

    console.log('[Video API] Generating video with prompt:', prompt?.substring(0, 50))

    const zai = await ZAI.create()

    // Use video generation from Z-AI SDK
    let result
    if (imageUrl) {
      // Image-to-video
      result = await zai.video.generations.create({
        prompt: prompt || 'Animate this image',
        image: imageUrl
      })
    } else {
      // Text-to-video
      result = await zai.video.generations.create({
        prompt: prompt
      })
    }

    console.log('[Video API] Result:', JSON.stringify(result, null, 2))

    if (result.taskId) {
      // Async task - return taskId for polling
      return NextResponse.json({
        success: true,
        taskId: result.taskId,
        status: 'processing',
        message: 'Video generation started. Poll for status.'
      })
    }

    if (result.videoUrl || result.data?.[0]?.url) {
      return NextResponse.json({
        success: true,
        videoUrl: result.videoUrl || result.data[0].url,
        status: 'completed'
      })
    }

    return NextResponse.json(
      { error: 'No video generated' },
      { status: 500 }
    )

  } catch (error: unknown) {
    console.error('[Video API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// GET - Check video status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()
    
    const result = await zai.async.result.query(taskId)

    if (result.status === 'completed' && result.videoUrl) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        videoUrl: result.videoUrl
      })
    }

    return NextResponse.json({
      success: true,
      status: result.status || 'processing',
      progress: result.progress || 0
    })

  } catch (error: unknown) {
    console.error('[Video API] Status check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

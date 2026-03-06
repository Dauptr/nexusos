import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, size = '1024x1024', referenceImage, isEditMode } = body

    console.log('[Generate Image] Prompt:', prompt?.substring(0, 50))
    console.log('[Generate Image] Size:', size)
    console.log('[Generate Image] Edit mode:', isEditMode)
    console.log('[Generate Image] Has reference:', !!referenceImage)

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required', success: false },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    let finalPrompt = prompt

    // If we have a reference image, analyze it first using VLM
    if (referenceImage) {
      console.log('[Generate Image] Analyzing reference image...')
      
      try {
        const vlmResponse = await zai.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: isEditMode 
                    ? `Analyze this image in detail for editing purposes. Describe:
                       1) Main subject and composition
                       2) Colors and lighting
                       3) Style and mood
                       4) Key visual elements
                       5) Background and setting
                       Be specific - this will be used to modify the image while maintaining consistency.`
                    : `Analyze this image's style and composition for reference. 
                       Describe the visual style, colors, mood, and key artistic elements.`
                },
                {
                  type: 'image_url',
                  image_url: { url: referenceImage }
                }
              ]
            }
          ],
        })

        const imageAnalysis = vlmResponse.choices?.[0]?.message?.content
        console.log('[Generate Image] VLM analysis:', imageAnalysis?.substring(0, 100))

        if (isEditMode) {
          // For editing: describe changes based on analysis
          finalPrompt = `Based on this image analysis: "${imageAnalysis}". 
                         Apply these specific changes: ${prompt}. 
                         Maintain the overall style, composition, and quality while incorporating the requested modifications.
                         Make the changes subtle and natural-looking.`
        } else {
          // For reference: use style from reference
          finalPrompt = `${prompt}. Style reference: ${imageAnalysis}. Match the visual style and quality of the reference.`
        }
      } catch (vlmError) {
        console.error('[Generate Image] VLM analysis failed:', vlmError)
        // Continue without analysis - just use the original prompt
        if (isEditMode) {
          finalPrompt = `Edit this image: ${prompt}`
        }
      }
    }

    console.log('[Generate Image] Final prompt:', finalPrompt?.substring(0, 100))

    // Generate the image
    const response = await zai.images.generations.create({
      prompt: finalPrompt,
      size: size as '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440',
    })

    console.log('[Generate Image] API response received')

    const imageData = response.data?.[0]
    const imageBase64 = imageData?.base64
    const imageUrl = imageData?.url

    if (imageBase64) {
      console.log('[Generate Image] Success! Base64 length:', imageBase64.length)
      return NextResponse.json({
        success: true,
        image: `data:image/png;base64,${imageBase64}`,
        imageUrl: `data:image/png;base64,${imageBase64}`,
        base64: imageBase64,
        isEdit: isEditMode,
      })
    } else if (imageUrl) {
      console.log('[Generate Image] Success! Image URL:', imageUrl)
      return NextResponse.json({
        success: true,
        image: imageUrl,
        imageUrl: imageUrl,
        url: imageUrl,
        isEdit: isEditMode,
      })
    } else {
      console.log('[Generate Image] No image data in response')
      return NextResponse.json(
        { error: 'No image generated', success: false },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('[Generate Image] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    )
  }
}

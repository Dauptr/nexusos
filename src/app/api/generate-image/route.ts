import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Force Node.js runtime (not Edge) to support child_process
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, size = '1024x1024', referenceImage, isEditMode } = body;

    console.log('[Generate Image] Received prompt:', prompt?.substring(0, 50));
    console.log('[Generate Image] Edit mode:', isEditMode);
    console.log('[Generate Image] Has reference:', !!referenceImage);

    if (!prompt || typeof prompt !== 'string') {
      console.log('[Generate Image] Invalid prompt');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Initialize Z-AI SDK
    const zai = await ZAI.create();

    let finalPrompt = prompt;

    // If we have a reference image, analyze it first using VLM
    if (referenceImage && isEditMode) {
      console.log('[Generate Image] Analyzing reference image with VLM...');

      try {
        const vlmResponse = await zai.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image in detail. Describe: 1) Main subject and composition 2) Colors and lighting 3) Style and mood 4) Key visual elements. Be specific and descriptive as this will be used to guide image editing.'
                },
                {
                  type: 'image_url',
                  image_url: { url: referenceImage }
                }
              ]
            }
          ],
        });

        const imageAnalysis = vlmResponse.choices?.[0]?.message?.content;
        console.log('[Generate Image] VLM analysis complete:', imageAnalysis?.substring(0, 100));

        finalPrompt = `Based on this image analysis: "${imageAnalysis}". Apply these changes: ${prompt}. Maintain the overall style and composition while incorporating the requested modifications.`;
      } catch (vlmError) {
        console.error('[Generate Image] VLM analysis failed:', vlmError);
        finalPrompt = `Edit this image: ${prompt}`;
      }
    }

    console.log('[Generate Image] Calling image generation API with size:', size);

    // Use Z-AI SDK for image generation
    const response = await zai.images.generations.create({
      prompt: finalPrompt,
      size: size as '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440',
    });

    console.log('[Generate Image] API response received');

    // Handle response format - could be base64 or URL
    const imageData = response.data?.[0];
    const imageBase64 = imageData?.base64;
    const imageUrl = imageData?.url;

    if (imageBase64) {
      console.log('[Generate Image] Success! Base64 length:', imageBase64.length);
      return NextResponse.json({
        success: true,
        imageUrl: `data:image/png;base64,${imageBase64}`,
        image: `data:image/png;base64,${imageBase64}`,
        base64: imageBase64,
        isEdit: isEditMode,
      });
    } else if (imageUrl) {
      console.log('[Generate Image] Success! Image URL:', imageUrl);
      return NextResponse.json({
        success: true,
        imageUrl: imageUrl,
        image: imageUrl,
        url: imageUrl,
        isEdit: isEditMode,
      });
    } else {
      console.log('[Generate Image] No image data in response');
      return NextResponse.json(
        { error: 'No image data received from AI' },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    console.error('[Generate Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

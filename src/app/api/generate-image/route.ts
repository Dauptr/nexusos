import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime (not Edge) to support child_process
export const runtime = 'nodejs';

// Z-AI API Configuration
const ZAI_CONFIG = {
  baseUrl: process.env.ZAI_BASE_URL || 'https://api.n-e-x-u-s-o-s.com/v1',
  token: process.env.ZAI_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMzE4Y2FlZWQtNWJhZi00ZDk3LTgxYjctNzI4NDMzMjEyZDVkIiwiY2hhdF9pZCI6Ijg4NDYwNzVkLWE3MWQtNGNkNC04YTMyLTIzZDM2OWFmMjZiZSJ9.5HYwGpY776m5bR8tb25nyo5zYanpvDTdWJjd74SRP8c',
  chatId: process.env.ZAI_CHAT_ID || '8846075d-a71d-4cd4-8a32-23d369af26be',
  userId: process.env.ZAI_USER_ID || '318caeed-5baf-4d97-81b7-728433212d5d',
};

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

    let finalPrompt = prompt;

    // If we have a reference image, analyze it first using VLM
    if (referenceImage && isEditMode) {
      console.log('[Generate Image] Analyzing reference image with VLM...');

      try {
        const vlmResponse = await fetch(`${ZAI_CONFIG.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Token': ZAI_CONFIG.token,
            'X-Chat-Id': ZAI_CONFIG.chatId,
            'X-User-Id': ZAI_CONFIG.userId,
            'X-Z-AI-From': 'Z',
          },
          body: JSON.stringify({
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
            thinking: { type: 'disabled' }
          }),
        });

        const vlmData = await vlmResponse.json();
        const imageAnalysis = vlmData.choices?.[0]?.message?.content;
        console.log('[Generate Image] VLM analysis complete:', imageAnalysis?.substring(0, 100));

        finalPrompt = `Based on this image analysis: "${imageAnalysis}". Apply these changes: ${prompt}. Maintain the overall style and composition while incorporating the requested modifications.`;
      } catch (vlmError) {
        console.error('[Generate Image] VLM analysis failed:', vlmError);
        finalPrompt = `Edit this image: ${prompt}`;
      }
    }

    console.log('[Generate Image] Calling image generation API with size:', size);

    // Call Z-AI image generation API directly
    const response = await fetch(`${ZAI_CONFIG.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': ZAI_CONFIG.token,
        'X-Chat-Id': ZAI_CONFIG.chatId,
        'X-User-Id': ZAI_CONFIG.userId,
        'X-Z-AI-From': 'Z',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        size: size,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate Image] API error:', response.status, errorText);
      return NextResponse.json(
        { error: `API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Generate Image] API response received');

    // Handle response format - could be base64 or URL
    const imageData = data.data?.[0];
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

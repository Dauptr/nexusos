import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Generate random invite code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET - Get user's invite links or get invite info by code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    console.log('[Invite API] GET request - code:', code)
    
    if (code) {
      // Get invite info by code
      const invite = await db.inviteLink.findUnique({
        where: { code },
        include: {
          createdBy: { select: { username: true, photoUrl: true } }
        }
      })
      
      console.log('[Invite API] Found invite:', invite ? invite.code : 'not found')
      
      if (!invite) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true, 
        invite: {
          code: invite.code,
          createdBy: invite.createdBy,
          used: !!invite.usedById,
          features: invite.features ? JSON.parse(invite.features) : null
        }
      })
    }
    
    // Get user's invite links
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[Invite API] User ID from cookie:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const invites = await db.inviteLink.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        usedBy: { select: { username: true, photoUrl: true } }
      }
    })
    
    console.log('[Invite API] Found invites:', invites.length)
    
    return NextResponse.json({ success: true, invites })
  } catch (error) {
    console.error('[Invite API] Error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// POST - Create new invite link with features
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[Invite API] POST request - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { features } = body
    
    console.log('[Invite API] Creating invite with features:', features)
    
    // Generate unique code
    let code = generateCode()
    let exists = await db.inviteLink.findUnique({ where: { code } })
    while (exists) {
      code = generateCode()
      exists = await db.inviteLink.findUnique({ where: { code } })
    }
    
    const invite = await db.inviteLink.create({
      data: {
        code,
        createdById: userId,
        features: features ? JSON.stringify(features) : null
      }
    })
    
    console.log('[Invite API] Created invite:', invite.code)
    
    return NextResponse.json({ 
      success: true, 
      invite: {
        code: invite.code,
        createdAt: invite.createdAt,
        features: features || null
      }
    })
  } catch (error) {
    console.error('[Invite API] Create error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// PUT - Use an invite code (for registration)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[Invite API] PUT request - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { code } = body
    
    if (!code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }
    
    const invite = await db.inviteLink.findUnique({
      where: { code }
    })
    
    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }
    
    if (invite.usedById) {
      return NextResponse.json({ error: 'Invite code already used' }, { status: 400 })
    }
    
    // Mark invite as used
    const updatedInvite = await db.inviteLink.update({
      where: { code },
      data: {
        usedById: userId,
        usedAt: new Date()
      }
    })
    
    // If invite has features, apply them to user
    if (invite.features) {
      const features = JSON.parse(invite.features)
      const user = await db.user.findUnique({ where: { id: userId } })
      const existingFeatures = user?.features ? JSON.parse(user.features) : {}
      const mergedFeatures = { ...existingFeatures, ...features }
      
      await db.user.update({
        where: { id: userId },
        data: { features: JSON.stringify(mergedFeatures) }
      })
    }
    
    console.log('[Invite API] Invite used successfully:', code)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Invite code applied successfully',
      features: invite.features ? JSON.parse(invite.features) : null
    })
  } catch (error) {
    console.error('[Invite API] Use error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

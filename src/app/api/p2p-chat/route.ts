import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET - Get messages between users
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[P2P Chat API] GET request - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('userId')
    
    if (otherUserId) {
      // Get conversation with specific user
      console.log('[P2P Chat API] Getting conversation with user:', otherUserId)
      
      const messages = await db.p2PMessage.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: otherUserId },
            { fromUserId: otherUserId, toUserId: userId }
          ]
        },
        orderBy: { createdAt: 'asc' },
        include: {
          fromUser: { select: { id: true, username: true, photoUrl: true } },
          toUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      // Mark as read
      await db.p2PMessage.updateMany({
        where: {
          fromUserId: otherUserId,
          toUserId: userId,
          read: false
        },
        data: { read: true }
      }).catch(() => {})
      
      return NextResponse.json({ success: true, messages })
    } else {
      // Get all conversations
      const sentMessages = await db.p2PMessage.findMany({
        where: { fromUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          toUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      const receivedMessages = await db.p2PMessage.findMany({
        where: { toUserId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          fromUser: { select: { id: true, username: true, photoUrl: true } }
        }
      })
      
      const unreadCount = await db.p2PMessage.count({
        where: { toUserId: userId, read: false }
      })
      
      // Combine and deduplicate users
      const conversations = new Map<string, { user: { id: string; username: string; photoUrl: string | null }; lastMessage: string; lastMessageTime: Date; unread: boolean }>()
      
      sentMessages.forEach(msg => {
        if (!conversations.has(msg.toUserId)) {
          conversations.set(msg.toUserId, {
            user: msg.toUser,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unread: false
          })
        }
      })
      
      receivedMessages.forEach(msg => {
        const existing = conversations.get(msg.fromUserId)
        if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessageTime)) {
          conversations.set(msg.fromUserId, {
            user: msg.fromUser,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unread: !msg.read
          })
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        conversations: Array.from(conversations.values()),
        unreadCount
      })
    }
  } catch (error) {
    console.error('[P2P Chat API] GET Error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 })
  }
}

// POST - Send message
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value
    
    console.log('[P2P Chat API] POST request - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }
    
    const body = await request.json()
    const { toUserId, content } = body
    
    if (!toUserId || !content?.trim()) {
      return NextResponse.json({ 
        error: 'Missing toUserId or content', 
        success: false 
      }, { status: 400 })
    }
    
    // Verify recipient exists
    const recipient = await db.user.findUnique({
      where: { id: toUserId }
    })
    
    if (!recipient) {
      return NextResponse.json({ 
        error: 'Recipient not found', 
        success: false 
      }, { status: 404 })
    }
    
    const message = await db.p2PMessage.create({
      data: {
        fromUserId: userId,
        toUserId,
        content: content.trim()
      },
      include: {
        fromUser: { select: { id: true, username: true, photoUrl: true } },
        toUser: { select: { id: true, username: true, photoUrl: true } }
      }
    })
    
    console.log('[P2P Chat API] Message created:', message.id)
    
    // Create notification for recipient
    await db.notification.create({
      data: {
        userId: toUserId,
        type: 'message',
        title: 'New Message',
        message: `New message from ${message.fromUser.username}`,
      }
    }).catch(() => {})
    
    return NextResponse.json({ success: true, message })
  } catch (error) {
    console.error('[P2P Chat API] POST Error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 })
  }
}

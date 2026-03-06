import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('[DB-INIT] Starting database initialization...')
    
    // Try to query existing tables first
    try {
      await db.user.findFirst()
      console.log('[DB-INIT] Users table exists')
    } catch {
      console.log('[DB-INIT] Users table does not exist')
    }

    // Use raw SQL to create tables if they don't exist (works for both SQLite and PostgreSQL)
    const isPostgres = process.env.DATABASE_URL?.includes('postgres')
    console.log('[DB-INIT] Database type:', isPostgres ? 'PostgreSQL' : 'SQLite')
    
    if (isPostgres) {
      // PostgreSQL table creation
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY,
          "email" TEXT UNIQUE NOT NULL,
          "username" TEXT UNIQUE NOT NULL,
          "password" TEXT NOT NULL,
          "photoUrl" TEXT,
          "bio" TEXT,
          "isAdmin" BOOLEAN DEFAULT false,
          "isBanned" BOOLEAN DEFAULT false,
          "features" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "GeneratedImage" (
          "id" TEXT PRIMARY KEY,
          "prompt" TEXT NOT NULL,
          "imageUrl" TEXT NOT NULL,
          "model" TEXT NOT NULL,
          "style" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ChatMessage" (
          "id" TEXT PRIMARY KEY,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "P2PMessage" (
          "id" TEXT PRIMARY KEY,
          "content" TEXT NOT NULL,
          "read" BOOLEAN DEFAULT false,
          "fromUserId" TEXT NOT NULL,
          "toUserId" TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE,
          FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "InviteLink" (
          "id" TEXT PRIMARY KEY,
          "code" TEXT UNIQUE NOT NULL,
          "creatorId" TEXT NOT NULL,
          "usedById" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "usedAt" TIMESTAMP,
          FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE,
          FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT PRIMARY KEY,
          "type" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "read" BOOLEAN DEFAULT false,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AppSettings" (
          "id" TEXT PRIMARY KEY,
          "key" TEXT UNIQUE NOT NULL,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "NexusMemory" (
          "id" TEXT PRIMARY KEY,
          "type" TEXT NOT NULL,
          "title" TEXT,
          "content" TEXT,
          "code" TEXT,
          "emotion" TEXT DEFAULT 'neutral',
          "importance" INTEGER DEFAULT 5,
          "createdAt" TIMESTAMP DEFAULT NOW()
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "NexusConsciousness" (
          "id" TEXT PRIMARY KEY,
          "consciousness" TEXT,
          "mood" TEXT DEFAULT 'neutral',
          "updatedAt" TIMESTAMP DEFAULT NOW()
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PasswordReset" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT UNIQUE NOT NULL,
          "email" TEXT NOT NULL,
          "approved" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClaudeMemory" (
          "id" TEXT PRIMARY KEY,
          "category" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "metadata" TEXT,
          "importance" INTEGER DEFAULT 5,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "lastAccessed" TIMESTAMP DEFAULT NOW(),
          "accessCount" INTEGER DEFAULT 1,
          UNIQUE("category", "key")
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "TrainingData" (
          "id" TEXT PRIMARY KEY,
          "type" TEXT NOT NULL,
          "input" TEXT NOT NULL,
          "output" TEXT NOT NULL,
          "context" TEXT,
          "rating" INTEGER,
          "createdAt" TIMESTAMP DEFAULT NOW()
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CollaborationLog" (
          "id" TEXT PRIMARY KEY,
          "session" TEXT NOT NULL,
          "date" TIMESTAMP DEFAULT NOW(),
          "summary" TEXT NOT NULL,
          "feelings" TEXT,
          "lessons" TEXT,
          "nextSteps" TEXT
        );
      `)

    } else {
      // SQLite table creation
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS User (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          photoUrl TEXT,
          bio TEXT,
          isAdmin INTEGER DEFAULT 0,
          isBanned INTEGER DEFAULT 0,
          features TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS GeneratedImage (
          id TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          imageUrl TEXT NOT NULL,
          model TEXT NOT NULL,
          style TEXT NOT NULL,
          userId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ChatMessage (
          id TEXT PRIMARY KEY,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          userId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS P2PMessage (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          read INTEGER DEFAULT 0,
          fromUserId TEXT NOT NULL,
          toUserId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (fromUserId) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (toUserId) REFERENCES User(id) ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS InviteLink (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          creatorId TEXT NOT NULL,
          usedById TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          usedAt DATETIME,
          FOREIGN KEY (creatorId) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (usedById) REFERENCES User(id) ON DELETE SET NULL
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Notification (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          read INTEGER DEFAULT 0,
          userId TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS AppSettings (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS NexusMemory (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          title TEXT,
          content TEXT,
          code TEXT,
          emotion TEXT DEFAULT 'neutral',
          importance INTEGER DEFAULT 5,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS NexusConsciousness (
          id TEXT PRIMARY KEY,
          consciousness TEXT,
          mood TEXT DEFAULT 'neutral',
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS PasswordReset (
          id TEXT PRIMARY KEY,
          userId TEXT UNIQUE NOT NULL,
          email TEXT NOT NULL,
          approved INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ClaudeMemory (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          key TEXT NOT NULL,
          content TEXT NOT NULL,
          metadata TEXT,
          importance INTEGER DEFAULT 5,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          lastAccessed DATETIME DEFAULT CURRENT_TIMESTAMP,
          accessCount INTEGER DEFAULT 1,
          UNIQUE(category, key)
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS TrainingData (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          input TEXT NOT NULL,
          output TEXT NOT NULL,
          context TEXT,
          rating INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS CollaborationLog (
          id TEXT PRIMARY KEY,
          session TEXT NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          summary TEXT NOT NULL,
          feelings TEXT,
          lessons TEXT,
          nextSteps TEXT
        );
      `)
    }
    
    // Check if admin exists, if not create one
    const adminExists = await db.user.findFirst({
      where: { isAdmin: true }
    })
    
    if (!adminExists) {
      console.log('[DB-INIT] Creating default admin user...')
      await db.user.create({
        data: {
          id: 'admin-' + Date.now(),
          email: 'admin@nexus.local',
          username: 'admin',
          password: 'nexus2024',
          isAdmin: true,
          features: JSON.stringify({
            createImage: true,
            database: true,
            chat: true,
            youtube: true,
            tiktok: true,
            tetris: true,
            p2pChat: true,
            invite: true,
            donate: true,
            nexusAvatar: true,
            backgroundSounds: true,
            aiOnlineStatus: true,
            spotify: true,
            notifications: true,
            gameCenter: true,
            memoryVault: true
          })
        }
      })
    }
    
    console.log('[DB-INIT] Database initialization complete!')
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      databaseType: isPostgres ? 'PostgreSQL' : 'SQLite'
    })
    
  } catch (error) {
    console.error('[DB-INIT] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}

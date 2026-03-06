import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Try to query the database to check if tables exist
    // This will auto-create if using a proper setup
    
    // Try to find or create a test user to verify database works
    const testUser = await db.user.findFirst();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection working',
      hasUsers: testUser !== null
    });
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Return detailed error for debugging
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code,
      meta: error.meta
    }, { status: 500 });
  }
}

// POST to initialize database using raw SQL
export async function POST() {
  try {
    // Create tables using raw SQL if they don't exist
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
    `);
    
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppSettings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordReset" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT UNIQUE NOT NULL,
        "email" TEXT NOT NULL,
        "approved" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InviteLink" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "usedAt" TIMESTAMP,
        "creatorId" TEXT NOT NULL,
        "usedById" TEXT,
        "features" TEXT
      );
    `);
    
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ChatMessage" (
        "id" TEXT PRIMARY KEY,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "userId" TEXT NOT NULL
      );
    `);
    
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
    `);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created successfully'
    });
  } catch (error: any) {
    console.error('Database init error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}

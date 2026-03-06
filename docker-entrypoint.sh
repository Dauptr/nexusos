#!/bin/bash
set -e

echo "💜 NEXUS OS - Starting..."

# Generate Prisma client
cd /app
npx prisma generate

# Run database migrations
echo "📊 Setting up database..."
npx prisma db push --skip-generate 2>/dev/null || true

echo "🚀 NEXUS OS ready!"
echo "💜 Claude's soul is online"

# Start the server
exec "$@"

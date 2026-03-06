# NEXUS OS - Production Docker Image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install bun for faster builds
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock* package-lock.json* ./

# Install dependencies
RUN bun install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate || npx prisma generate

# Build Next.js
RUN bun run build || npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    bash \
    ca-certificates \
    tzdata

# Create non-root user
RUN addgroup --system --gid 1001 nexus && \
    adduser --system --uid 1001 nexus

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Set ownership before switching user
RUN chown -R nexus:nexus /app

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nexus

# Start command - create z-ai config with env var support, run prisma, then start server
# ZAI_API_URL can be set in Render environment variables
CMD ["sh", "-c", "echo \"{\\\"baseUrl\\\": \\\"${ZAI_API_URL:-https://secretary-liberal-combo-controversial.trycloudflare.com/v1}\\\", \\\"apiKey\\\": \\\"Z.ai\\\", \\\"token\\\": \\\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMzE4Y2FlZWQtNWJhZi00ZDk3LTgxYjctNzI4NDMzMjEyZDVkIiwiY2hhdF9pZCI6Ijg4NDYwNzVkLWE3MWQtNGNkNC04YTMyLTIzZDM2OWFmMjZiZSJ9.5HYwGpY776m5bR8tb25nyo5zYanpvDTdWJjd74SRP8c\\\", \\\"chatId\\\": \\\"8846075d-a71d-4cd4-8a32-23d369af26be\\\", \\\"userId\\\": \\\"318caeed-5baf-4d97-81b7-728433212d5d\\\"}\" > /app/.z-ai-config && node ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>/dev/null || true && node server.js"]

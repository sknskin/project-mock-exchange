FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json ./
COPY packages/common/package.json ./packages/common/
COPY packages/event-store/package.json ./packages/event-store/
COPY services/user-auth/package.json ./services/user-auth/
RUN pnpm install --frozen-lockfile --filter @mock-exchange/user-auth...

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/common/node_modules ./packages/common/node_modules
COPY --from=deps /app/services/user-auth/node_modules ./services/user-auth/node_modules
COPY . .
RUN pnpm turbo run build --filter=@mock-exchange/user-auth...
RUN cd services/user-auth && npx prisma generate

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/services/user-auth/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/services/user-auth/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/services/user-auth/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/user-auth/package.json ./

USER nestjs

EXPOSE 3007

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3007/health/live || exit 1

CMD ["node", "dist/main.js"]

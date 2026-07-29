# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY backend/prisma ./prisma
RUN npm run prisma:generate

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY share /app/share
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS=--enable-source-maps

WORKDIR /app/backend

COPY --chown=node:node backend/package.json backend/package-lock.json ./
COPY --chown=node:node backend/prisma ./prisma
COPY --chown=node:node --from=builder /app/backend/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/backend/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]

# syntax=docker/dockerfile:1.7

# Build the Vite application in a reproducible Node image.
FROM node:22-alpine AS builder

WORKDIR /app/frontend

# Copy lockfiles first so dependency installation remains cacheable.
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY frontend/ ./
COPY share/ /app/share/
RUN npm run build

# Serve the compiled SPA from a small, unprivileged Nginx image.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

# Meridian DMS Frontend

React, Vite, TypeScript, Ant Design Pro, Zustand, and TanStack Query frontend.

## Local development

```bash
npm install
npm run dev
```

## Production checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Docker

From the repository root:

```bash
docker build -f frontend/Dockerfile -t meridian-dms-frontend .
docker run --rm -p 8080:8080 meridian-dms-frontend
```

The image uses a Vite build stage and an unprivileged Nginx runtime.

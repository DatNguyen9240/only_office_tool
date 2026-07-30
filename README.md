# Meridian DMS

Enterprise document management interface built with React, Vite, TypeScript,
Ant Design Pro, Zustand, and TanStack Query.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

## Deployment

The frontend is deployed by Vercel from the `frontend` root directory:

```text
Build command: npm run build
Output directory: dist
Install command: npm ci
```

Set `VITE_API_URL` in Vercel to the public HTTPS API URL.

The backend API and MinIO run in Docker on the remote Windows server.
PostgreSQL and ONLYOFFICE remain external services. Copy `.env.example` to
`.env`, copy `backend/.env.example` to `backend/.env`, and configure:

```env
NODE_ENV=production
PORT=3000
WEB_APP_URL=https://your-project.vercel.app
DATABASE_URL=postgresql://meridian:password@host.docker.internal:5435/meridian_dms
ONLYOFFICE_SERVER_URL=http://host.docker.internal:8080
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=use-a-strong-password
S3_ACCESS_KEY=minio
S3_SECRET_KEY=use-the-same-strong-password
S3_BUCKET=meridian-documents
S3_PUBLIC_ENDPOINT=https://files.example.com
```

`MINIO_ROOT_USER` must equal `S3_ACCESS_KEY`, and `MINIO_ROOT_PASSWORD` must
equal `S3_SECRET_KEY`. Set `MINIO_DATA_PATH` in the repository-level `.env` to
choose the host directory that stores object data, for example:

```env
MINIO_DATA_PATH=C:/Dat/meridian-minio-data
```

Deploy MinIO, initialize the bucket, apply the database migration, and start
the API:

```powershell
docker.exe compose pull minio minio-init
docker.exe compose build api
docker.exe compose run --rm api npm run prisma:deploy
docker.exe compose up -d
docker.exe compose ps
```

The API is exposed on host port `5000` (container port `3000`). Put it behind an HTTPS reverse proxy or
Cloudflare before setting `VITE_API_URL`.

MinIO's S3 port and console are bound to the Windows loopback interface on
ports `9000` and `9001`. Reverse proxy the public file hostname to
`http://127.0.0.1:9000`; do not proxy the console publicly. The API connects
to MinIO through the private Compose network as `http://minio:9000`.

The frontend Dockerfile remains available for local production-image testing:

```bash
docker build -f frontend/Dockerfile -t meridian-dms-frontend .
docker run --rm -p 8080:8080 meridian-dms-frontend
```

Production verification:

```bash
cd frontend
npm run lint
npm run typecheck
npm run build

cd ../backend
npm run typecheck
npm run build
```

The workspace includes persisted English/Vietnamese language selection and
system, light, and dark theme modes. Translation resources live in
`frontend/src/i18n`.

## Routes

- `/login`
- `/dashboard`
- `/documents`
- `/editor/:id`
- `/shared`
- `/trash`
- `/admin/users`
- `/admin/audit`

## ONLYOFFICE integration

The editor requests a per-document configuration from the API, including a
signed document URL, a changing document key for each version, and a callback
URL for saving new versions.

## Architecture

- `frontend/src/app`: providers, routing, and theme
- `frontend/src/components/layout`: application shell
- `frontend/src/components/documents`: document navigation, browser, and details
- `frontend/src/components/editor`: ONLYOFFICE integration boundary
- `frontend/src/pages`: route-level screens
- `frontend/src/store`: Zustand UI state
- `frontend/src/i18n`: typed English and Vietnamese translation resources
- `frontend/src/hooks`: TanStack Query data access and API integration
- `backend`: NestJS backend foundation and Prisma schema
- `share`: shared public API types used by frontend and backend
- `frontend/DESIGN_SPEC.md`: product design and UX specification
- `frontend/WORKSPACE_DESIGN_SPEC.md`: employee workspace design system and UX flows
- `backend/WORKSPACE_BACKEND.md`: backend architecture and implementation workspace

## Current data layer

The active document, folder, dashboard, user, and audit routes use the
authenticated API. Features without a backend endpoint are visibly disabled
until their API is implemented.

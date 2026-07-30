# Meridian DMS API

NestJS backend foundation for the Meridian DMS frontend.

## Local setup

1. Copy `.env.example` to `.env` and set the local PostgreSQL and ONLYOFFICE
   values.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

4. Create the first database migration:

   ```bash
   npm run prisma:migrate
   ```

5. Start the API:

   ```bash
   npm run start:dev
   ```

Health endpoints:

```text
GET http://localhost:3000/api/health
GET http://localhost:3000/api/health/database
GET http://localhost:3000/api/health/onlyoffice
```

They report PostgreSQL and ONLYOFFICE independently. A dependency that is not
running is reported as `down` without preventing the API from starting.

## Docker deployment

The repository-level Compose file runs the backend API, MinIO, and a one-shot
bucket initialization container. The frontend is deployed separately by
Vercel.

On a Windows server running Docker Desktop, create `backend/.env`. For
PostgreSQL and ONLYOFFICE installed directly on Windows, use Docker Desktop's
built-in `host.docker.internal` hostname:

```env
NODE_ENV=production
PORT=3000
WEB_APP_URL=https://your-project.vercel.app
DATABASE_URL=postgresql://meridian:password@host.docker.internal:5435/meridian_dms
ONLYOFFICE_SERVER_URL=http://host.docker.internal:8080
S3_ENDPOINT=http://host.docker.internal:9000
S3_PUBLIC_ENDPOINT=https://files.example.com
S3_REGION=us-east-1
S3_ACCESS_KEY=minio
S3_SECRET_KEY=use-a-strong-password
S3_BUCKET=meridian-documents
S3_FORCE_PATH_STYLE=true
S3_URL_TTL_SECONDS=900
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=use-the-same-strong-password
MINIO_METRICS_URL=http://minio:9000
MINIO_METRICS_TOKEN=
STORAGE_QUOTA_BYTES=107374182400
```

Dashboard storage capacity is read from MinIO metrics v3, with automatic v2
fallback. MinIO requires a bearer token by default. Generate one with
`mc admin prometheus generate ALIAS --api-version v3` and copy the generated
`bearer_token` value to `MINIO_METRICS_TOKEN`. For a trusted local-only MinIO
deployment, metrics can instead be made public by starting MinIO with
`MINIO_PROMETHEUS_AUTH_TYPE=public`; leave `MINIO_METRICS_TOKEN` empty in that
case. When metrics are unavailable, the dashboard explicitly falls back to
`STORAGE_QUOTA_BYTES`.

The Compose file overrides `S3_ENDPOINT` and `MINIO_METRICS_URL` with the
private `http://minio:9000` service address. Configure `S3_PUBLIC_ENDPOINT`
with the HTTPS hostname used by browsers for presigned uploads/downloads.

From the repository root:

```powershell
docker.exe compose pull minio minio-init
docker.exe compose build api
docker.exe compose run --rm api npm run prisma:deploy
docker.exe compose up -d
docker.exe compose ps
```

Docker Desktop resolves `host.docker.internal` without an explicit Compose
host mapping. PostgreSQL must listen on an address reachable from Docker and
allow the Docker network in `pg_hba.conf`. The API uses host port `5000` and
container port `3000`.

File transfer uses presigned S3/MinIO URLs. The API only creates document
metadata and versions; browsers upload and download bytes directly from
`S3_PUBLIC_ENDPOINT`, avoiding an extra API hop and memory pressure in NestJS.

# Meridian DMS Backend Workspace

## Purpose

This document defines the backend foundation for the Meridian DMS frontend.
The current frontend uses sample data and local UI state. The backend will
replace those placeholders with authenticated, persistent document workflows.

## Local Architecture

```text
React/Vite        http://localhost:5173
        |
        v
NestJS API        http://localhost:3000
   |          |             |
   v          v             v
PostgreSQL   MinIO        ONLYOFFICE Docs
 :5432       :9000        http://localhost:<port>
                  |
                  v
                Redis
                :6379
```

PostgreSQL and ONLYOFFICE Docs are installed on the developer machine. MinIO
and Redis may run in Docker during development. Nginx is optional locally and
is reserved for a production-like reverse proxy.

## Service Responsibilities

| Service | Responsibility | Local endpoint |
| --- | --- | --- |
| NestJS | Authenticated REST API, authorization, orchestration | `http://localhost:3000` |
| PostgreSQL | Users, metadata, permissions, versions, audit records | `localhost:5432` |
| MinIO/S3 | Original files and document versions | `http://localhost:9000` |
| Redis | Cache, rate limits, background job queue | `localhost:6379` |
| ONLYOFFICE Docs | Browser document editing and conversion | `http://localhost:<port>` |
| Nginx | Reverse proxy and TLS termination in production | `80/443` |

## Suggested Backend Stack

- NestJS with the Express adapter
- Prisma ORM
- PostgreSQL
- AWS S3 SDK compatible with MinIO
- Passport with OIDC or JWT authentication
- BullMQ with Redis for asynchronous jobs
- class-validator and class-transformer for request validation

## Modules

### Auth

- Login, logout, refresh session, and current-user endpoint
- OIDC/SSO integration when an organization identity provider is available
- Server-side role checks for `Employee`, `Manager`, and `Administrator`

### Documents

- List and search documents by folder, owner, status, and shared scope
- Create folders and move documents between folders
- Generate upload and download URLs
- Soft-delete to trash, restore, and permanent delete
- Star/favorite and rename operations

### Versions

- Create a new immutable version for every uploaded or saved file
- List version history
- Restore a previous version as a new current version

### Sharing

- Grant and revoke `Viewer`, `Commenter`, and `Editor` permissions
- Generate restricted share links
- Record invitations and permission changes in the audit log

### OnlyOffice

- Generate a per-document editor configuration
- Use a changing document key for every source version
- Expose a callback endpoint for saved files
- Validate callback payloads and persist the new version to MinIO/PostgreSQL

### Administration

- User listing, role/status updates, and invitations
- Audit log search with actor, action, resource, outcome, and IP

## Core Data Model

```text
User
  id, email, name, department, role, status, createdAt, lastActiveAt

Folder
  id, name, parentId, ownerId, createdAt, updatedAt

Document
  id, name, type, folderId, ownerId, status, starred, currentVersionId

DocumentVersion
  id, documentId, versionNumber, objectKey, sizeBytes, checksum
  createdById, createdAt, note

DocumentPermission
  id, documentId, userId/email, role, grantedById, createdAt

ShareLink
  id, documentId, tokenHash, expiresAt, permission, createdById

AuditLog
  id, timestamp, actorId, action, resourceType, resourceId
  outcome, ip, userAgent, metadata
```

The database stores metadata and object keys only. File contents belong in
MinIO/S3.

## Shared API Types

Public request and response types live in `share/index.d.ts`. Frontend and
backend code import them through the `@share` alias. Prisma enums and models
remain database concerns and must be mapped to the shared API types at the API
boundary.

When document endpoints are implemented, generate the OpenAPI document from
NestJS DTOs and use it to replace handwritten API clients in the frontend.

## API Shape

All routes are prefixed with `/api`.

```text
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me

GET    /documents?scope=all|shared|trash&folderId=...
POST   /documents/upload
POST   /documents/upload-url
POST   /documents/:id/upload-complete
GET    /documents/:id/download-url
GET    /documents/:id
PATCH  /documents/:id
DELETE /documents/:id
POST   /documents/:id/restore
POST   /documents/:id/star
DELETE /documents/:id/permanent
POST   /documents/:id/star
GET    /documents/:id/download

GET    /documents/:id/versions
POST   /documents/:id/versions/:versionId/restore

GET    /documents/:id/permissions
POST   /documents/:id/permissions
PATCH  /documents/:id/permissions/:permissionId
DELETE /documents/:id/permissions/:permissionId
POST   /documents/:id/share-link

GET    /documents/:id/editor-config
POST   /documents/:id/onlyoffice/callback

GET    /admin/users
PATCH  /admin/users/:id
GET    /admin/audit

GET    /folders?parentId=...
POST   /folders
PATCH  /folders/:id
DELETE /folders/:id

GET    /health/storage
```

Responses should preserve the public field names in `share/index.d.ts`
where practical (`id`, `name`, `type`, `modifiedAt`, `folderId`, `shared`,
`permission`, and so on).

## OnlyOffice Save Flow

1. The frontend requests `GET /documents/:id/editor-config`.
2. NestJS checks the current user's permission.
3. NestJS returns a signed MinIO URL and a version-specific document key.
4. The frontend loads the ONLYOFFICE API script and creates the editor.
5. ONLYOFFICE calls `POST /documents/:id/onlyoffice/callback` after a save.
6. The API downloads the saved file, writes a new object to MinIO, creates a
   `DocumentVersion`, updates `Document.currentVersionId`, and records audit.

The document URL must be reachable from the ONLYOFFICE process. Never expose a
permanent public URL for private documents; use short-lived signed URLs.

## Environment Variables

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://meridian:password@localhost:5432/meridian_dms

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minio
S3_SECRET_KEY=change-me
S3_BUCKET=meridian-documents
S3_FORCE_PATH_STYLE=true

REDIS_URL=redis://localhost:6379

ONLYOFFICE_SERVER_URL=http://localhost:<port>
ONLYOFFICE_JWT_SECRET=change-me
WEB_APP_URL=http://localhost:5173
```

Secrets must live in local `.env` files or a secrets manager and must never be
committed.

## Security Requirements

- Enforce authorization in every document and folder query.
- Validate extension, MIME type, size, and file signature on upload.
- Use signed URLs with short expiry for private file access.
- Hash passwords with Argon2id when local password auth is unavoidable.
- Enable JWT validation for ONLYOFFICE callbacks.
- Rate-limit auth, upload, share, and callback endpoints.
- Write audit records for downloads, edits, shares, deletes, restores, and
  permission changes.
- Schedule trash cleanup after the 30-day retention period.

## Delivery Phases

### Phase 1: API Foundation

- Scaffold NestJS, Prisma, configuration, health endpoint, and migrations.
- Add `User`, `Folder`, `Document`, and `DocumentVersion`.
- Replace `useDocuments` sample query with `GET /api/documents`.

### Phase 2: Files

- Add MinIO/S3 adapter, multipart upload, signed download URLs, and checksums.
- Connect the upload modal to the API.

### Phase 3: Access and Lifecycle

- Add authentication, RBAC, permissions, sharing, trash, and restore.
- Connect share and trash actions in the frontend.

### Phase 4: Editing

- Add editor config and ONLYOFFICE callback handling.
- Persist new versions and connect the editor route.

### Phase 5: Operations

- Add Redis/BullMQ workers, antivirus scanning, email invitations, cleanup
  jobs, backups, metrics, and production Nginx/TLS.

## Definition of Done

- A user can sign in and only see authorized documents.
- Upload, download, share, edit, version, trash, and restore persist after a
  restart.
- ONLYOFFICE saves create immutable versions.
- Admin audit records explain every sensitive action.
- `npm run typecheck`, backend tests, migrations, and Docker health checks pass.

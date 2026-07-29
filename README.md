# Meridian DMS

Enterprise document management interface built with React, Vite, TypeScript,
Ant Design Pro, Zustand, and TanStack Query.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

## Run frontend with Docker

Build and start the frontend production container:

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The container serves the
Vite build with Nginx and includes SPA fallback routing for all application
routes. Stop it with:

```bash
docker compose down
```

To build and run without Compose:

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
```

The workspace includes persisted English/Vietnamese language selection and
system, light, and dark theme modes. Translation resources live in
`frontend/src/i18n`.

## Routes

- `/login`
- `/workspace` employee document workspace
- `/dashboard`
- `/documents`
- `/editor/:id`
- `/shared`
- `/trash`
- `/admin/users`
- `/admin/audit`

## ONLYOFFICE integration

The editor currently stays in a clearly labeled preview mode. A production
backend should provide a per-document ONLYOFFICE editor config, including a
signed document URL, a changing document key for each version, and a callback
URL for saving new versions.

## Architecture

- `frontend/src/app`: providers, routing, and theme
- `frontend/src/components/layout`: application shell
- `frontend/src/components/documents`: document-management components
- `frontend/src/components/workspace`: employee workspace navigation, browser, and details
- `frontend/src/components/editor`: ONLYOFFICE integration boundary
- `frontend/src/pages`: route-level screens
- `frontend/src/store`: Zustand UI state
- `frontend/src/i18n`: typed English and Vietnamese translation resources
- `frontend/src/hooks`: TanStack Query data access
- `frontend/src/data`: sample API data for the frontend prototype
- `backend`: NestJS backend foundation and Prisma schema
- `share`: shared public API types used by frontend and backend
- `frontend/DESIGN_SPEC.md`: product design and UX specification
- `frontend/WORKSPACE_DESIGN_SPEC.md`: employee workspace design system and UX flows
- `backend/WORKSPACE_BACKEND.md`: backend architecture and implementation workspace

## Current data layer

The included dataset is sample workspace data. Replace the query functions in
`frontend/src/hooks` with API clients while keeping query keys and route
components stable.

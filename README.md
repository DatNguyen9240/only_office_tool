# Meridian DMS

Enterprise document management interface built with React, Vite, TypeScript,
Ant Design Pro, Zustand, and TanStack Query.

## Run locally

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run lint
npm run typecheck
npm run build
```

The workspace includes persisted English/Vietnamese language selection and
system, light, and dark theme modes. Translation resources live in `src/i18n`.

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

Copy `.env.example` to `.env.local` and configure:

- `VITE_ONLYOFFICE_SERVER_URL`: Base URL of the ONLYOFFICE Document Server.
- `VITE_SAMPLE_DOCUMENT_URL`: Public or signed URL of the document to edit.

The editor route loads `web-apps/apps/api/documents/api.js` from the configured
Document Server and creates a `DocsAPI.DocEditor` instance. Without these
variables, the route uses a clearly labeled preview mode.

For a production backend, replace the sample document configuration with a
server-generated editor config and signed callback URL. Document keys must
change whenever the source file changes.

## Architecture

- `src/app`: providers, routing, and theme
- `src/components/layout`: application shell
- `src/components/documents`: document-management components
- `src/components/workspace`: employee workspace navigation, browser, and details
- `src/components/editor`: ONLYOFFICE integration boundary
- `src/pages`: route-level screens
- `src/store`: Zustand UI state
- `src/i18n`: typed English and Vietnamese translation resources
- `src/hooks`: TanStack Query data access
- `src/data`: sample API data for the frontend prototype
- `DESIGN_SPEC.md`: product design and UX specification
- `WORKSPACE_DESIGN_SPEC.md`: employee workspace design system and UX flows

## Current data layer

The included dataset is sample workspace data. Replace the query functions in
`src/hooks` with API clients while keeping query keys and route components
stable.

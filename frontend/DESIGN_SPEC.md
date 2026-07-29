# Meridian DMS Product Design Specification

## Design read

Reading this as a dense enterprise operations product for employees, managers, and administrators, with a trust-first and workflow-efficient language, leaning toward Ant Design Pro with restrained motion and a single document-blue accent.

This is a greenfield product. The repository contains no existing brand, interface, content, routes, or accessibility patterns to preserve.

## Design dials

- `DESIGN_VARIANCE: 3` because predictable placement and stable scanning patterns are more valuable than expressive composition in a daily-use DMS.
- `MOTION_INTENSITY: 2` because motion should confirm actions and explain state changes, not compete with document work.
- `VISUAL_DENSITY: 8` because the product must expose names, ownership, permissions, versions, timestamps, and actions with minimal navigation cost.

## 1. Brand personality

Meridian DMS is calm, exact, dependable, and administratively mature. It should feel like infrastructure that employees trust with sensitive work.

The personality is expressed through:

- Direct labels such as "Upload files", "Manage access", and "Restore".
- Stable navigation and familiar enterprise patterns.
- Restrained visual emphasis. Color communicates action, status, and risk.
- Operational language instead of marketing language.
- Clear ownership and audit context at the point of action.

The brand avoids playful illustrations, exaggerated empty states, consumer-style social language, and novelty interactions.

## 2. Color system

The application uses a light theme with cool neutral surfaces and one blue accent.

### Core tokens

| Role | Token | Value |
|---|---|---|
| Primary action | `colorPrimary` | `#275DAD` |
| Primary hover | `colorPrimaryHover` | `#3470C8` |
| Primary active | `colorPrimaryActive` | `#1F4A8C` |
| App canvas | `colorBgLayout` | `#F4F6F8` |
| Main surface | `colorBgContainer` | `#FFFFFF` |
| Subtle surface | custom | `#F8FAFC` |
| Primary text | `colorText` | `#172033` |
| Secondary text | `colorTextSecondary` | `#5D687A` |
| Hairline | `colorBorderSecondary` | `#E5EAF0` |
| Success | semantic | `#2F7D55` |
| Warning | semantic | `#A86412` |
| Error | semantic | `#B84444` |

Blue is reserved for selected navigation, primary actions, links, focus, and active file context. Status colors remain semantic and are not used decoratively.

Contrast targets are WCAG AA for all interface text and controls. Focus uses a visible 2 px blue outline with offset.

## 3. Typography system

The primary family is IBM Plex Sans. It reads as institutional and technical without feeling sterile.

| Style | Size / line | Weight | Use |
|---|---|---|---|
| Page title | 24 / 32 | 600 | Route-level heading |
| Section title | 16 / 24 | 600 | Pane and grouped content heading |
| Body | 14 / 22 | 400 | Default interface copy |
| Label | 13 / 20 | 500 | Forms, filters, metadata |
| Caption | 12 / 18 | 400 | Secondary metadata |
| Numeric | 14 / 20 | 500 | Counts, file sizes, versions |

Numbers use tabular figures. File names may use 500 weight, while metadata remains regular. Uppercase text is limited to short document-type marks.

## 4. Layout strategy

### Application frame

- Desktop sidebar: 248 px expanded, 72 px collapsed.
- Global header: 64 px.
- Main content: full available width with 24 px page padding.
- Standard content max width: none for file-management routes, 1440 px for dashboard and admin summary routes.
- Main surfaces sit on the gray canvas with 1 px borders. Shadows are reserved for floating overlays.

### Page families

- Dashboard: title bar, operational metrics, activity and storage regions.
- File manager: folder tree, file list, optional preview pane.
- Admin: page title, filters, data table, contextual drawers or modals.
- Editor: dedicated full-width workspace with a compact document toolbar.
- Login: two-column desktop composition, single-column mobile form.

### Shape rules

- Controls and surface containers: 8 px radius.
- Small tags and avatars: Ant Design semantic shapes.
- Buttons are not pill-shaped.
- Modal and drawer surfaces use 12 px only where Ant Design applies elevated-container geometry.

## 5. Navigation structure

### Primary navigation

- Dashboard
- Documents
- Shared with me
- Trash
- Administration
  - Users
  - Audit logs

### Global header

- Mobile navigation trigger
- Current route breadcrumb
- Global document search
- Help
- Notifications
- User menu

The current destination is represented through blue text, a pale blue selection surface, and a slim left selection rail. Administration expands only when the user is on an admin route or explicitly opens it.

## 6. Component system

### Foundations

- Ant Design provides controls, tables, forms, feedback, navigation, and overlays.
- Ant Design Pro provides the application shell and higher-level data presentation.
- Zustand stores cross-route interface preferences and transient file action context.
- TanStack Query owns asynchronous document, activity, user, and audit data.

### Core components

| Component | Responsibility |
|---|---|
| `AppLayout` | Route shell, responsive sidebar state, global header, outlet |
| `Sidebar` | Product identity, navigation, storage indicator |
| `Header` | Breadcrumbs, search, alerts, help, account actions |
| `FileTable` | Dense document rows, selection, sorting, actions, loading and empty states |
| `FolderTree` | Hierarchical folder navigation and selection |
| `FileCard` | Optional compact grid representation |
| `SearchBar` | Search input with scope and keyboard affordance |
| `UploadModal` | Upload queue, destination, drag area, validation |
| `SharePermissionModal` | Invite people, choose role, review current access |
| `VersionHistoryDrawer` | Version timeline, author, restore and download actions |
| `DocumentPreview` | File metadata, preview content, quick actions |

### Density rules

- Default table row height: 52 px.
- Compact admin tables: 48 px.
- Default control height: 40 px.
- Toolbar gap: 8 px.
- Section gap: 16 px.
- Page region gap: 24 px.

## 7. Interaction patterns

### Selection and command

- Clicking a document row selects it and opens preview when the preview pane is enabled.
- Double-clicking a supported document opens the editor.
- Checkboxes enable batch operations without changing the current preview target.
- Row overflow menus contain secondary actions.
- Destructive actions require confirmation.

### Search and filters

- Global search can navigate to Documents with the query applied.
- Route filters update results without a full page transition.
- Search uses a short debounce in production APIs. The local implementation filters immediately.

### Upload

- The user opens Upload, drags or selects files, confirms the destination, then sees success feedback.
- Unsupported or oversized files receive inline errors in the queue.
- The modal keeps the user in context.

### Sharing

- The user invites a person or group with Viewer, Commenter, or Editor access.
- Existing access is visible before a new invitation is sent.
- Removing access is explicit and confirmed.

### Version history

- Versions open in a right drawer so the document context remains visible.
- The current version is clearly labeled.
- Restore is a confirmed action that creates a new version rather than deleting history.

### System states

- Loading uses row and content skeletons shaped like the final layout.
- Empty states explain the reason and expose one next action.
- Errors stay inline for persistent problems. Toasts are used for completed or transient actions.
- Disabled states explain missing permission through a tooltip when needed.

## 8. Responsive behavior

### Desktop, 1280 px and above

- Expanded sidebar.
- Folder tree, file table, and preview can coexist.
- Global search remains in the header.

### Compact desktop and tablet, 768 to 1279 px

- Sidebar collapses to icons.
- Preview moves to a drawer.
- Folder tree narrows or moves into a drawer below 1024 px.
- Table hides lower-priority columns such as owner and size.

### Mobile, below 768 px

- Sidebar becomes a temporary drawer.
- Header search moves into the page toolbar.
- File table changes to a compact list with name, type, date, and overflow action.
- Folder tree is opened from a toolbar button.
- Modals use near-full width. Drawers use full width.
- Dashboard metrics stack to one column.

No route relies on hover. Touch targets are at least 40 px.

## 9. Motion principles

Motion only communicates feedback or a state transition.

- Sidebar collapse: Ant Design layout transition.
- Drawers and modals: Ant Design entrance and exit motion.
- Row hover: color change only.
- Button press: 1 px downward translation.
- Selection: immediate background and border state.
- Success: message feedback, no celebratory animation.
- Reduced-motion preference removes non-essential transitions.

There are no perpetual animations, parallax effects, marquees, scroll hijacking, or decorative reveal sequences.

## Complete application layout

```text
App
├─ /login
│  ├─ Brand and trust panel
│  └─ Sign-in form
└─ Authenticated AppLayout
   ├─ Sidebar
   ├─ Header
   └─ Route content
      ├─ /dashboard
      ├─ /documents
      ├─ /editor/:id
      ├─ /shared
      ├─ /trash
      ├─ /admin/users
      └─ /admin/audit
```

## Page structure

### `/login`

- Meridian DMS identity
- Security and product context
- Email and password form
- Remember me and password recovery
- Enterprise SSO action

### `/dashboard`

- Greeting and primary document actions
- Document, shared, review, and storage metrics
- Recent documents table
- Activity feed
- Storage summary

### `/documents`

- Breadcrumb and page actions
- Search, filters, sort, view toggle
- Folder tree
- File table or card grid
- Document preview
- Upload, sharing, and version overlays

### `/editor/:id`

- Back navigation
- File title, save state, version, and sharing action
- ONLYOFFICE integration boundary
- Comments and collaborator context

### `/shared`

- Shared document filters
- Owner, access level, and modified metadata
- Preview and sharing actions where allowed

### `/trash`

- Retention notice
- Deleted-document table
- Restore and permanent-delete commands

### `/admin/users`

- User totals and pending access summary
- Search and role/status filters
- User table
- Invite and edit user actions

### `/admin/audit`

- Date, actor, action, and resource filters
- Export action
- Audit event table
- Event details drawer

## Component architecture

```text
src
├─ app
│  ├─ App.tsx
│  ├─ router.tsx
│  ├─ providers.tsx
│  └─ theme.ts
├─ components
│  ├─ layout
│  │  ├─ AppLayout.tsx
│  │  ├─ Sidebar.tsx
│  │  └─ Header.tsx
│  ├─ documents
│  │  ├─ FileTable.tsx
│  │  ├─ FolderTree.tsx
│  │  ├─ FileCard.tsx
│  │  ├─ SearchBar.tsx
│  │  ├─ UploadModal.tsx
│  │  ├─ SharePermissionModal.tsx
│  │  ├─ VersionHistoryDrawer.tsx
│  │  └─ DocumentPreview.tsx
│  └─ common
├─ pages
├─ data
├─ hooks
├─ store
├─ types
└─ styles
```

## Ant Design component mapping

| Product need | Ant Design / Pro component |
|---|---|
| Application frame | `ProLayout` |
| Route title and actions | `PageContainer` |
| Data tables | `ProTable` and `Table` |
| Search and filters | `Input.Search`, `ProFormSelect`, `DatePicker.RangePicker` |
| Folder navigation | `Tree` |
| Primary actions | `Button`, `Dropdown` |
| File upload | `Upload.Dragger`, `Modal`, `Progress` |
| Sharing workflow | `Modal`, `Form`, `Select`, `Avatar`, `List`, `Tag` |
| Version history | `Drawer`, `Timeline` |
| Preview | `Drawer`, `Descriptions`, `Image`, `Result` |
| Dashboard metrics | `Statistic`, `Progress` with accessible labels |
| Feedback | `App`, `Alert`, `Result`, `Skeleton`, `Empty` |
| User editing | `ModalForm`, `ProFormText`, `ProFormSelect` |
| Audit inspection | `Drawer`, `Descriptions`, `Typography.Text` |

Ant Design icons are used because they are the official icon family for the selected design system. No second icon family is introduced.

## UX flows

### Find and edit a document

1. Open Documents.
2. Select a folder or search.
3. Inspect the file in the preview pane.
4. Double-click the row or choose Open.
5. Edit in the ONLYOFFICE surface.
6. Return to Documents with the file context retained.

### Upload and share

1. Choose Upload files.
2. Select files and destination.
3. Confirm upload.
4. Select the uploaded file.
5. Open Manage access.
6. Add people and choose a role.
7. Confirm and receive success feedback.

### Restore a version

1. Select a document.
2. Open Version history.
3. Review version author and timestamp.
4. Choose Restore on a prior version.
5. Confirm that a new current version will be created.
6. Return to the document with updated version metadata.

### Restore a deleted document

1. Open Trash.
2. Select one or more documents.
3. Choose Restore.
4. Confirm destination if the original folder is unavailable.
5. Receive success feedback and remove restored rows from Trash.

### Review an audit event

1. Open Administration, then Audit logs.
2. Filter by date, actor, action, or resource.
3. Open an event row.
4. Review device, IP, resource, and outcome.
5. Export filtered events if authorized.


# Meridian Workspace Design Specification

## 1. Product direction

Meridian Workspace is a daily document environment for employees. It should feel calm, dependable, and fast. The interface borrows the familiar mental model of enterprise file tools without copying their visual identity.

The product is not an administration dashboard. The primary experience is a workspace:

- Navigation answers "where are my documents?"
- Search answers "how do I find something now?"
- The file browser answers "what can I do with this item?"
- The details surface answers "what is this file, who can access it, and what changed?"

### Design dials

- Design variance: 3 of 10
- Motion intensity: 2 of 10
- Visual density: 7 of 10

The UI is intentionally predictable. Personality comes from disciplined typography, file-type color cues, precise density, and useful empty and loading states rather than decoration.

## 2. Existing product audit

### Preserve

- Meridian blue as the single interaction accent
- IBM Plex Sans for an operational, enterprise tone
- Cool neutral surfaces and restrained 8 px corner radius
- Existing preview, sharing, version history, upload, and ONLYOFFICE patterns
- Existing file-type icon language

### Change for the employee workspace

- Replace administrator-oriented navigation with document destinations
- Replace KPI-card composition with quick access, folders, files, storage, and activity
- Keep information close to the file browser instead of splitting routine work across many pages
- Use contextual document details so employees do not lose their current folder or selection

## 3. Design system

### Brand personality

- Professional: clear labels, stable layouts, familiar controls
- Trustworthy: permissions, ownership, versions, and destructive actions are explicit
- Efficient: the common actions are visible and keyboard-friendly
- Calm: limited color, minimal motion, and no decorative charts

### Color

| Token | Value | Purpose |
| --- | --- | --- |
| Accent | `#275DAD` | Primary actions, selected navigation, links |
| Accent hover | `#1F4C91` | Interactive hover |
| Canvas | `#F4F6F8` | Application background |
| Surface | `#FFFFFF` | Header, sidebar, browser, drawers |
| Text | `#172033` | Primary content |
| Text secondary | `#5D687A` | Metadata and supporting copy |
| Border | `#E5EAF0` | Structural separation |
| Success | `#2E7D5B` | Completed uploads and current versions |
| Warning | `#A56410` | Storage and permission attention |
| Danger | `#C53B3B` | Delete and destructive actions |

File-type colors remain functional and appear only in icons or small labels. They do not become large decorative backgrounds.

### Typography

IBM Plex Sans is used throughout.

- Page title: 24 px, 32 px line height, 600 weight
- Section title: 16 px, 24 px line height, 600 weight
- Body and controls: 14 px, 22 px line height, 400 or 500 weight
- Metadata: 13 px, 20 px line height, 400 weight
- Table header: 12 px, 18 px line height, 600 weight, no forced uppercase

### Spacing and shape

- Base spacing unit: 4 px
- Common spacing: 8, 12, 16, 24, 32 px
- Control height: 40 px
- Compact table row: 52 to 56 px
- Corner radius: 8 px for controls and surfaces
- Border first, shadow only for overlays and menus

### Icons

Use Ant Design icons only. Icons clarify actions and file types. They are not used as decoration or mixed with emoji.

## 4. Layout strategy

### Desktop, 1200 px and wider

- 232 px fixed workspace sidebar
- 64 px fixed-height header
- Main content uses a fluid center column
- My Drive includes a 304 px contextual rail for storage, shared files, and activity
- File lists use the full available width on other destinations
- Document details open in a 440 px drawer and preserve list context

### Tablet, 768 to 1199 px

- Sidebar collapses to a 72 px icon rail
- The contextual rail is removed
- The header keeps search and core create actions
- The sidebar can temporarily expand over content
- File table hides lower-priority metadata columns

### Mobile, below 768 px

- Desktop sidebar is removed
- Five primary destinations move to a fixed bottom navigation
- Header becomes two rows when search is active
- File lists become compact touch-friendly rows
- Grid view uses two columns when space permits
- Document details and modals use the full viewport width
- The primary create action remains reachable in the header

## 5. Navigation structure

The employee navigation is intentionally shallow:

- My Drive
- Shared With Me
- Recent
- Favorites
- Trash

My Drive is the default destination. Folder navigation happens inside the content area through folders and breadcrumbs. This avoids a second permanently expanded navigation tree competing with the primary sidebar.

## 6. Page structure

### `/workspace`

The single workspace route changes its content based on the active destination.

#### My Drive

1. Page title and breadcrumb
2. Frequently opened files
3. Folder navigation
4. File manager toolbar
5. List or grid file browser
6. Desktop contextual rail with storage, shared files, and activity

#### Shared With Me

- Files shared by colleagues
- Owner and permission level are prominent
- Standard filter, sort, view, selection, and context actions

#### Recent

- Files ordered by recent activity
- Modified time is prominent

#### Favorites

- Starred files and folders
- Empty state explains how to add favorites

#### Trash

- Deleted items with deletion metadata
- Restore is the primary contextual action
- Permanent deletion requires confirmation

### Document detail surface

The employee document page is a contextual drawer inside `/workspace`. This keeps the current folder, filters, and selection intact. It contains:

- File identity and metadata
- Permission status and collaborators
- Version timeline
- Comments
- Share action
- Primary "Open in ONLYOFFICE" action

Opening the editor routes to `/editor/:id`.

## 7. Component architecture

```text
WorkspacePage
├── WorkspaceSidebar
├── WorkspaceHeader
│   ├── GlobalSearch
│   ├── CreateFolderAction
│   ├── UploadAction
│   ├── Notifications
│   └── UserMenu
├── WorkspaceContent
│   ├── WorkspaceOverview
│   │   ├── QuickAccessStrip
│   │   ├── FolderGrid
│   │   └── WorkspaceRail
│   ├── WorkspaceToolbar
│   ├── WorkspaceFileTable
│   └── WorkspaceFileGrid
├── WorkspaceBottomNav
├── WorkspaceDetailsDrawer
│   ├── FileInformation
│   ├── PermissionList
│   ├── VersionTimeline
│   └── CommentsPanel
├── UploadModal
├── SharePermissionModal
└── VersionHistoryDrawer
```

Workspace-specific components own presentation and local interactions. Existing document primitives remain reusable for upload, share, preview, and version history.

## 8. Ant Design component mapping

| Product pattern | Ant Design component |
| --- | --- |
| Workspace shell | `Layout`, `Sider`, `Header`, `Content` |
| Primary navigation | `Menu` |
| Search | `Input.Search` |
| Create actions | `Button`, `Dropdown`, `Upload` |
| Breadcrumb | `Breadcrumb` |
| View switch | `Segmented` |
| Sorting and filtering | `Select`, `Popover`, `Badge` |
| File list | `Table` |
| File grid | `Card`, `Checkbox` |
| Multi-select actions | `Space`, `Button`, `Typography` |
| Right-click actions | `Dropdown`, `Menu` |
| Document details | `Drawer`, `Tabs`, `Descriptions`, `Timeline` |
| Sharing and folder creation | `Modal`, `Form` |
| Storage | `Progress` |
| Feedback | `App`, `Alert`, `Empty`, `Skeleton`, `Result` |
| User and collaborators | `Avatar`, `Avatar.Group` |

Ant Design Pro is used where it improves product structure and data behavior. The employee workspace avoids Pro dashboard conventions such as statistic grids and analytics cards.

## 9. Core UX flows

### Find and open

1. Search from any workspace destination.
2. Results update the active file collection.
3. Single click selects a file and opens details.
4. Double click, Enter, or Open launches ONLYOFFICE.

### Upload

1. Choose Upload in the header.
2. Select or drag files into the upload modal.
3. Confirm the destination folder.
4. Show progress and completion feedback.
5. Insert the new file into the current collection.

### Create folder

1. Choose Create folder.
2. Enter a unique name.
3. Create in the current breadcrumb location.
4. Focus the new folder in the folder row.

### Share

1. Open Share from the row, details drawer, or context menu.
2. Add people and assign View, Comment, or Edit.
3. Review current access before saving.
4. Confirm the permission change in place.

### Organize

1. Select one or more items.
2. Use the batch bar for Move, Download, Share, or Delete.
3. Keep selection visible until the action completes or is canceled.

### Context menu

Right click a file to access Open, Rename, Move, Share, Download, Version history, and Delete. Menu order follows frequency, with destructive actions separated at the bottom.

### Document processing (Merge & PDF)

1. Select a document.
2. In the details drawer, Context Menu, or action bar, select "Merge Word" or "Convert to PDF".
3. For Word merging:
   - Input placeholder mappings in the provided form.
   - Confirm and trigger the action.
   - The UI shows a loading state, then inserts the newly merged file version.
4. For PDF conversion:
   - Click "Convert to PDF".
   - Upon successful conversion, the UI inserts the new `.pdf` document alongside the original document in the active folder.

### Version recovery

1. Open the Versions tab in document details or choose Version history.
2. Review author, timestamp, and notes.
3. Restore a prior version only after confirmation.
4. Preserve the restored version as a new current version.

## 10. Interaction and motion

- Hover uses subtle background and border changes
- Selected rows use a low-contrast blue surface and visible checkbox
- Focus rings are always visible for keyboard users
- Navigation transitions last 120 to 160 ms
- Drawers and menus use Ant Design motion defaults
- No entrance choreography, floating animation, or decorative transforms
- Reduced-motion preferences disable non-essential transitions
- Loading states preserve the final layout using skeleton rows
- Empty states explain the next useful action
- Errors remain close to the failed action and include recovery guidance

## 11. Accessibility and content rules

- Minimum touch target is 40 px
- Color is never the only indicator of state
- Icon-only controls include accessible names and tooltips
- Context actions are also available through visible row controls and keyboard navigation
- Destructive actions require confirmation
- File names truncate visually but remain available through a tooltip
- Labels use direct workplace language, such as "Shared With Me" and "Open in ONLYOFFICE"

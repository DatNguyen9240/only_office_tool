export type DocumentType = "docx" | "xlsx" | "pptx" | "pdf" | "folder";
export type DocumentStatus = "ready" | "review" | "locked" | "deleted";
export type PermissionRole = "Viewer" | "Commenter" | "Editor" | "Owner";

export interface DocumentItem {
  id: string;
  name: string;
  type: DocumentType;
  owner: string;
  modifiedAt: string;
  size: string;
  status: DocumentStatus;
  folderId: string;
  shared: boolean;
  starred?: boolean;
  deletedAt?: string;
  permission?: PermissionRole;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
  count: number;
}

export interface PermissionEntry {
  id: string;
  name: string;
  email: string;
  role: PermissionRole;
  initials: string;
}

export interface VersionEntry {
  id: string;
  version: string;
  author: string;
  createdAt: string;
  size: string;
  current?: boolean;
  note?: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  resource: string;
  at: string;
}

export type UserRole = "Employee" | "Manager" | "Administrator";
export type UserStatus = "Active" | "Invited" | "Suspended";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  outcome: "Success" | "Denied";
  ip: string;
  device: string;
}

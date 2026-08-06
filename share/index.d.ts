export type DocumentType = "docx" | "xlsx" | "pptx" | "pdf" | "folder";
export type DocumentStatus = "ready" | "review" | "locked" | "deleted";
export type PermissionRole = "Viewer" | "Commenter" | "Editor" | "Owner";

export interface DocumentItem {
  id: string;
  version: number;
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
  metadata?: Record<string, unknown> | null;
  tags?: Array<{ id: string; name: string; color?: string | null }>;
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
  kind?: "user" | "group";
  groupId?: string;
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
  timestamp: string;
  outcome: string;
}

export type UserRole = "EMPLOYEE" | "MANAGER" | "ADMINISTRATOR";
export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: UserRole;
  status: UserStatus;
  lastActiveAt: string | null;
  createdAt: string;
}

export type AuthRole = "EMPLOYEE" | "MANAGER" | "ADMINISTRATOR";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  department?: string | null;
}

export interface AuthTokensResponse {
  tokenType: "Bearer";
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  actorEmail: string | null;
  action: string;
  resource: string;
  outcome: "SUCCESS" | "DENIED" | "FAILED";
  ip: string | null;
  device: string | null;
}

export interface DashboardResponse {
  metrics: {
    documents: number;
    folders: number;
    sharedWithMe: number;
    inReview: number;
    versions: number;
  };
  storage: {
    source: "minio_metrics_v3" | "minio_metrics_v2" | "configured_quota";
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
    workspaceBytes: number;
    documentsBytes: number;
    versionsBytes: number;
    percent: number;
    measuredAt: string | null;
  };
  activities: ActivityItem[];
}

export type DependencyStatus = "up" | "down" | "not_configured";

export interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  services: {
    database: DependencyStatus;
    onlyoffice: DependencyStatus;
    storage: DependencyStatus;
  };
}

export interface DependencyHealthResponse {
  service: "database" | "onlyoffice" | "storage";
  status: DependencyStatus;
  timestamp: string;
}

export type MeetingStatus =
  | "scheduled"
  | "live"
  | "recording"
  | "processing"
  | "transcribing"
  | "analyzing"
  | "completed"
  | "failed";

export interface MeetingItem {
  id: string;
  title: string;
  roomName: string;
  status: MeetingStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  duration?: number | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  score?: number;
}

export interface TranscriptSegment {
  id: number;
  meetingId: string;
  participantId: string;
  participantName: string;
  trackId?: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number;
  words?: TranscriptWord[];
}

export interface MeetingTopic {
  title: string;
  summary: string;
  startTime?: number;
  endTime?: number;
}

export interface MeetingDecision {
  id: string;
  content: string;
  decidedByParticipantIds: string[];
  evidenceSegmentIds: number[];
}

export interface MeetingActionItem {
  id: string;
  task: string;
  assigneeParticipantId: string | null;
  assigneeName: string | null;
  deadline: string | null;
  status: "open" | "completed";
  confidence: number;
  evidenceSegmentIds: number[];
}

export interface MeetingRisk {
  id: string;
  risk: string;
  mitigation?: string | null;
  evidenceSegmentIds: number[];
}

export interface MeetingQuestion {
  id: string;
  question: string;
  evidenceSegmentIds: number[];
}

export interface MeetingAnalysis {
  title: string;
  summary: string;
  topics: MeetingTopic[];
  decisions: MeetingDecision[];
  actionItems: MeetingActionItem[];
  risks: MeetingRisk[];
  unansweredQuestions: MeetingQuestion[];
}

export interface MeetingPlaybackResponse {
  meetingId: string;
  title: string;
  videoUrl: string | null;
  duration: number;
  peaks: number[];
  transcriptUrl: string | null;
  analysisStatus: MeetingStatus;
}


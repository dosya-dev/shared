/**
 * Shared type definitions for dosya.dev web + desktop apps.
 */

// ── User & Auth ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  login_method: string;
  subscription_status: string | null;
  cancel_at_period_end: number;
  avatar_url: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  device_name: string | null;
  ip_address: string | null;
  location: string | null;
  created_at: string;
  last_used_at: string | null;
  is_current: boolean;
}

// ── Workspace ────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  icon_initials: string;
  icon_color: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface WorkspaceSettings {
  max_file_size_gb: number;
  max_total_storage_gb: number;
  max_storage_per_member_gb: number;
  max_concurrent_uploads: number;
  allowed_extensions: string | null;
  blocked_extensions: string | null;
  require_2fa: number;
  disable_share_links: number;
  force_share_password: number;
  share_max_expiry_days: number | null;
}

// ── Files & Folders ──────────────────────────────────────────────────

export interface FileItem {
  id: string;
  name: string;
  kind: "file" | "folder";
  size_bytes: number;
  mime_type: string | null;
  extension: string | null;
  region: string | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  folder_id: string | null;
  workspace_id: string;
  is_favourite: number;
  is_locked: number;
  is_hidden: number;
  created_at: string;
  updated_at: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  r2_key: string;
  size_bytes: number;
  created_at: string;
  created_by: string;
}

/** File metadata returned by share link endpoints. */
export interface FileInfo {
  id: string;
  name: string;
  size_bytes: number;
  mime_type: string;
  extension: string | null;
  region: string;
  uploader_name: string | null;
}

export interface FolderTreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  children: FolderTreeNode[];
}

// ── Sharing ──────────────────────────────────────────────────────────

export interface ShareLink {
  id: string;
  file_id: string;
  file_name: string;
  token: string;
  is_password_protected: number;
  expires_at: string | null;
  download_count: number;
  created_at: string;
  created_by: string;
  status: "active" | "expired" | "revoked";
}

// ── File Requests ────────────────────────────────────────────────────

export interface FileRequest {
  id: string;
  workspace_id: string;
  created_by: string;
  token: string;
  recipient_email: string | null;
  expires_at: string | null;
  max_files: number | null;
  uploaded_files_count: number;
  status: "open" | "closed";
  created_at: string;
}

// ── Activity ─────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  created_at: string;
}

// ── Dashboard ────────────────────────────────────────────────────────

export interface DashboardStats {
  total_files: number;
  shared_externally: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recent_files: FileItem[];
  recent_activity: ActivityLog[];
}

// ── Billing ──────────────────────────────────────────────────────────

export type PlanId = "free" | "starter" | "plus" | "pro" | "business";

export interface Subscription {
  plan: PlanId;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: number;
}

// ── Teams ────────────────────────────────────────────────────────────

export interface Invite {
  id: string;
  email: string;
  role_id: string;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  expires_at: string;
}

// ── Search ───────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  name: string;
  kind: "file" | "folder";
  path: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  extension: string | null;
  updated_at: string;
}

// ── API Response Wrappers ────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
  status?: number;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

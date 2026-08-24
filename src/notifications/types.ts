/** One row from GET /api/notifications. Field names mirror the D1 columns. */
export interface NotificationItem {
  id: string;
  kind: "personal" | "broadcast";
  type: string;
  category: string;
  priority: string;
  title: string;
  body: string | null;
  icon: string | null;
  /** Server-authored WEB route. Translate with mapActionPath before routing. */
  link_path: string | null;
  /** JSON string; parse with parseActions. */
  actions: string | null;
  actor_name: string | null;
  created_at: number;
  read_at: number | null;
  dismissed_at: number | null;
}

export interface NotificationAction {
  handler: "navigate" | "dismiss";
  label: string;
  params?: { path?: string };
}

/** Shape of GET /api/notifications/summary. */
export interface NotificationSummary {
  unread: number;
  latest: NotificationItem | null;
}

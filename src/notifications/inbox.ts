import type { NotificationItem, NotificationSummary } from "./types";

/**
 * The slice of client state these reducers own. The badge count and the list
 * live together on purpose: they are updated in one step or not at all, which
 * is what stops the badge disagreeing with the list after an optimistic update.
 */
export interface InboxState {
  items: NotificationItem[];
  unread: number;
}

export function isUnread(item: NotificationItem): boolean {
  return item.read_at == null;
}

/**
 * Reducers return the SAME object reference when nothing changed, so callers
 * can skip a re-render and, more importantly, so a double tap cannot decrement
 * `unread` twice for one item.
 */
export function applyRead(state: InboxState, id: string, now: number): InboxState {
  const target = state.items.find((i) => i.id === id);
  if (!target || !isUnread(target)) return state;
  return {
    items: state.items.map((i) => (i.id === id ? { ...i, read_at: now } : i)),
    unread: Math.max(0, state.unread - 1),
  };
}

export function applyReadAll(state: InboxState, now: number): InboxState {
  return {
    items: state.items.map((i) => (isUnread(i) ? { ...i, read_at: now } : i)),
    unread: 0,
  };
}

export function applyDismiss(state: InboxState, id: string): InboxState {
  const target = state.items.find((i) => i.id === id);
  if (!target) return state;
  return {
    items: state.items.filter((i) => i.id !== id),
    unread: isUnread(target) ? Math.max(0, state.unread - 1) : state.unread,
  };
}

/**
 * Flatten paginated responses. The list endpoint merges personal and broadcast
 * rows server-side, and a row can legitimately appear on two pages when a new
 * notification lands between fetches, so dedupe by id and re-sort rather than
 * trusting page order.
 */
export function mergeInboxPages(pages: NotificationItem[][]): NotificationItem[] {
  const seen = new Map<string, NotificationItem>();
  for (const page of pages) {
    for (const it of page) if (!seen.has(it.id)) seen.set(it.id, it);
  }
  return [...seen.values()].sort((a, b) => b.created_at - a.created_at);
}

/**
 * GET /api/notifications paginates on `before` = the last item's created_at and
 * caps `limit` at 50. A page shorter than the limit is the end of the list.
 */
export function nextCursor(items: NotificationItem[], limit: number): number | null {
  if (items.length === 0 || items.length < limit) return null;
  return items[items.length - 1].created_at;
}

/**
 * Fold a summary poll into badge state. `hasNew` is deliberately false on the
 * first poll: with no baseline, every existing notification would look new and
 * the client would fire an arrival toast for history.
 */
export function applySummary(
  prev: { lastLatestId: string | null },
  summary: NotificationSummary,
): { unread: number; lastLatestId: string | null; hasNew: boolean } {
  const newId = summary.latest?.id ?? prev.lastLatestId;
  const hasNew =
    !!summary.latest && summary.latest.id !== prev.lastLatestId && prev.lastLatestId !== null;
  return { unread: summary.unread, lastLatestId: newId ?? null, hasNew };
}

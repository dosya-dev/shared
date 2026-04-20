/**
 * Shared numeric constants for dosya.dev.
 */

export const SECONDS_PER_DAY = 86_400;

export const MB = 1_048_576;
export const GB = 1_073_741_824;
export const TB = 1_099_511_627_776;

/** Current Unix timestamp in seconds. */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

/** Format bytes into a human-readable string (e.g. "1.5 GB"). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < GB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes < TB) return `${(bytes / GB).toFixed(1)} GB`;
  return `${(bytes / TB).toFixed(2)} TB`;
}

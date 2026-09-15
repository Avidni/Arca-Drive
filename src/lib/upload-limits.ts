import type { CategoryType } from "@/types";

/**
 * Single source of truth for per-category upload limits.
 *
 * Limits are configured per user in Settings and stored in
 * `user_security_settings` — NOT in environment variables. The presign API
 * enforces them server-side (authoritative); the upload dialog reads the same
 * values for client-side UX. Defaults below apply only until a user changes
 * them, or as a fallback when a settings row can't be read.
 */

export const UPLOAD_CATEGORIES: readonly CategoryType[] = [
  "image",
  "video",
  "document",
  "files",
] as const;

/** Default per-category limit in megabytes, used when unset. */
export const DEFAULT_UPLOAD_LIMITS_MB: Record<CategoryType, number> = {
  image: 25,
  video: 500,
  document: 50,
  files: 500,
};

/** Maps a category to its column in `user_security_settings`. */
export const UPLOAD_LIMIT_COLUMNS: Record<CategoryType, string> = {
  image: "max_image_upload_mb",
  video: "max_video_upload_mb",
  document: "max_document_upload_mb",
  files: "max_files_upload_mb",
};

/** Minimum a user may set a limit to (MB). */
export const MIN_UPLOAD_LIMIT_MB = 1;
/** Maximum a user may set a limit to (MB) — 10 GB ceiling. */
export const MAX_UPLOAD_LIMIT_MB = 10240;

export type UploadLimitsMb = Record<CategoryType, number>;

function coerceLimit(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < MIN_UPLOAD_LIMIT_MB) return fallback;
  return Math.min(Math.floor(n), MAX_UPLOAD_LIMIT_MB);
}

/**
 * Derive per-category limits from a `user_security_settings` row (or any
 * object carrying the limit columns). Falls back to defaults for missing or
 * invalid values, so callers always receive a complete, valid limit set.
 */
export function limitsFromSettings(
  row: Record<string, unknown> | null | undefined
): UploadLimitsMb {
  return {
    image: coerceLimit(row?.[UPLOAD_LIMIT_COLUMNS.image], DEFAULT_UPLOAD_LIMITS_MB.image),
    video: coerceLimit(row?.[UPLOAD_LIMIT_COLUMNS.video], DEFAULT_UPLOAD_LIMITS_MB.video),
    document: coerceLimit(row?.[UPLOAD_LIMIT_COLUMNS.document], DEFAULT_UPLOAD_LIMITS_MB.document),
    files: coerceLimit(row?.[UPLOAD_LIMIT_COLUMNS.files], DEFAULT_UPLOAD_LIMITS_MB.files),
  };
}

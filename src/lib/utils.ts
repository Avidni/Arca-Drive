import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "")
    .slice(0, 200);
}

export function getFileTypeFromMime(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
export const VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];
export const DOCUMENT_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "ppt", "pptx",
];
export const FILES_EXTENSIONS = [
  "zip", "rar", "7z", "gz", "tar", "bz2", "xz", "zst", "iso", "img",
  "exe", "msi", "dmg", "apk", "deb", "rpm",
];

export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: IMAGE_EXTENSIONS,
  video: VIDEO_EXTENSIONS,
  document: DOCUMENT_EXTENSIONS,
  files: FILES_EXTENSIONS,
};

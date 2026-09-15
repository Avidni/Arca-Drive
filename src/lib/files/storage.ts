import type { StorageSummary } from "@/types";

export function calculateStorageSummary(files: { file_type: string; size: number }[]): StorageSummary {
  const summary: StorageSummary = {
    total: 0,
    images: 0,
    videos: 0,
    documents: 0,
    files: 0,
    imageCount: 0,
    videoCount: 0,
    documentCount: 0,
    fileCount: 0,
  };

  for (const file of files) {
    summary.total += file.size;
    if (file.file_type === "image") {
      summary.images += file.size;
      summary.imageCount++;
    } else if (file.file_type === "video") {
      summary.videos += file.size;
      summary.videoCount++;
    } else if (file.file_type === "document") {
      summary.documents += file.size;
      summary.documentCount++;
    } else if (file.file_type === "files") {
      summary.files += file.size;
      summary.fileCount++;
    }
  }

  return summary;
}

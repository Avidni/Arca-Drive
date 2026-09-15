"use client";

import { FileCard } from "./FileCard";
import type { FileRecord } from "@/types";

interface FileGridProps {
  files: FileRecord[];
  onPreview?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  onDetails?: (file: FileRecord) => void;
}

export function FileGrid({ files, onPreview, onDelete, onDetails }: FileGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => (
        <FileCard
          key={file.id}
          file={file}
          onPreview={onPreview}
          onDelete={onDelete}
          onDetails={onDetails}
        />
      ))}
    </div>
  );
}

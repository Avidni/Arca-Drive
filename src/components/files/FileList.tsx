"use client";

import { useState, useCallback, useRef } from "react";
import { CopyUrlButton } from "@/components/shared/CopyUrlButton";
import { StepUpVerificationDialog } from "@/components/security/StepUpVerificationDialog";
import { formatBytes, formatDate } from "@/lib/utils";
import {
  FileText,
  Image,
  Film,
  FileArchive,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Lock,
} from "lucide-react";
import type { FileRecord, StepUpMethod } from "@/types";

interface FileListProps {
  files: FileRecord[];
  onPreview?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  onDetails?: (file: FileRecord) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  image: <Image className="h-5 w-5 text-muted-foreground" />,
  video: <Film className="h-5 w-5 text-muted-foreground" />,
  document: <FileText className="h-5 w-5 text-muted-foreground" />,
  files: <FileArchive className="h-5 w-5 text-muted-foreground" />,
};

export function FileList({ files, onPreview, onDelete, onDetails }: FileListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [stepUpInfo, setStepUpInfo] = useState<{
    allowedMethods: StepUpMethod[];
    reason: string;
  } | null>(null);
  const pendingSignedFileIdRef = useRef<string | null>(null);

  const requestSignedUrl = useCallback(async (fileId: string) => {
    const res = await fetch("/api/r2/signed-view-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
    });
    if (res.status === 403) {
      const data = await res.json();
      if (data.stepUpRequired) {
        pendingSignedFileIdRef.current = fileId;
        setStepUpInfo({ allowedMethods: data.allowedMethods, reason: data.reason });
        return null;
      }
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data.signedUrl || null;
  }, []);

  const handleDownload = async (file: FileRecord) => {
    if (file.public_url) {
      window.open(file.public_url, "_blank");
    } else {
      const url = await requestSignedUrl(file.id);
      if (url) window.open(url, "_blank");
    }
  };

  return (
    <>
      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div
              className="flex cursor-pointer items-center gap-4 flex-1 min-w-0"
              onClick={() => onDetails?.(file)}
            >
              {iconMap[file.file_type] || <FileText className="h-5 w-5 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                  {file.name}
                  {file.visibility === "private" && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {file.mime_type} · {formatBytes(file.size)} · {formatDate(file.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <CopyUrlButton
                url={file.public_url || ""}
                isPrivate={file.visibility === "private"}
                onRequestSignedUrl={() => requestSignedUrl(file.id)}
              />
              <button
                onClick={() => handleDownload(file)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === file.id ? null : file.id)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpen === file.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
                      <button
                        onClick={() => { setMenuOpen(null); onPreview?.(file); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </button>
                      <button
                        onClick={() => { setMenuOpen(null); onDetails?.(file); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      <button
                        onClick={() => { setMenuOpen(null); onDelete?.(file); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {stepUpInfo && (
        <StepUpVerificationDialog
          open={!!stepUpInfo}
          onClose={() => { setStepUpInfo(null); pendingSignedFileIdRef.current = null; }}
          onVerified={() => { setStepUpInfo(null); pendingSignedFileIdRef.current = null; }}
          allowedMethods={stepUpInfo.allowedMethods}
          reason={stepUpInfo.reason}
        />
      )}
    </>
  );
}

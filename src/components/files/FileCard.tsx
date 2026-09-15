"use client";

import { useState, useCallback, useRef } from "react";
import { CopyUrlButton } from "@/components/shared/CopyUrlButton";
import { StepUpVerificationDialog } from "@/components/security/StepUpVerificationDialog";
import { formatBytes, formatDate } from "@/lib/utils";
import {
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  FileText,
  Film,
  Image as ImageIcon,
  FileArchive,
  Lock,
} from "lucide-react";
import type { FileRecord, StepUpMethod } from "@/types";

interface FileCardProps {
  file: FileRecord;
  onPreview?: (file: FileRecord) => void;
  onDelete?: (file: FileRecord) => void;
  onDetails?: (file: FileRecord) => void;
}

export function FileCard({ file, onPreview, onDelete, onDetails }: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedThumbUrl, setSignedThumbUrl] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);
  const [stepUpInfo, setStepUpInfo] = useState<{
    allowedMethods: StepUpMethod[];
    reason: string;
  } | null>(null);
  const pendingSignedFileIdRef = useRef<string | null>(null);

  const requestSignedUrl = useCallback(async () => {
    const res = await fetch("/api/r2/signed-view-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: file.id }),
    });
    if (res.status === 403) {
      const data = await res.json();
      if (data.stepUpRequired) {
        pendingSignedFileIdRef.current = file.id;
        setStepUpInfo({ allowedMethods: data.allowedMethods, reason: data.reason });
        return null;
      }
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data.signedUrl || null;
  }, [file.id]);

  const handlePreview = () => {
    if (file.visibility === "private" && file.file_type === "image") {
      if (!signedThumbUrl && !thumbError) {
        requestSignedUrl().then((url) => {
          if (url) setSignedThumbUrl(url);
          else setThumbError(true);
        });
      }
      if (signedThumbUrl) {
        onPreview?.({ ...file, public_url: signedThumbUrl });
      } else if (!thumbError) {
        onPreview?.(file);
      }
    } else {
      onPreview?.(file);
    }
  };

  const handleDownload = () => {
    if (file.public_url) {
      window.open(file.public_url, "_blank");
    } else {
      requestSignedUrl().then((url) => {
        if (url) window.open(url, "_blank");
      });
    }
  };

  const iconMap: Record<string, React.ReactNode> = {
    image: <ImageIcon className="h-6 w-6 text-muted-foreground" />,
    video: <Film className="h-6 w-6 text-muted-foreground" />,
    document: <FileText className="h-6 w-6 text-muted-foreground" />,
    files: <FileArchive className="h-6 w-6 text-muted-foreground" />,
  };

  const thumbnailUrl = file.visibility === "private" && signedThumbUrl ? signedThumbUrl : file.public_url;

  return (
    <>
      <div className="group relative rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
        <div
          className="relative aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t-xl bg-muted/50 cursor-pointer"
          onClick={handlePreview}
        >
          {file.file_type === "image" && thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : file.file_type === "video" ? (
            <div className="relative flex h-full w-full items-center justify-center bg-muted">
              {iconMap.video}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50">
                  <div className="ml-0.5 h-0 w-0 border-y-8 border-y-transparent border-l-12 border-l-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {iconMap.document}
              <span className="text-xs text-muted-foreground">{file.mime_type}</span>
            </div>
          )}
          {file.visibility === "private" && (
            <div className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5">
              <Lock className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <div className="p-3">
          <p className="truncate text-sm font-medium text-foreground" title={file.name}>
            {file.name}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatBytes(file.size)}</span>
            <span>·</span>
            <span>{formatDate(file.created_at)}</span>
          </div>
        </div>

        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100">
          <CopyUrlButton
            url={file.public_url || ""}
            isPrivate={file.visibility === "private"}
            onRequestSignedUrl={requestSignedUrl}
          />
          <button
            onClick={handleDownload}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-background/90 hover:text-foreground"
            aria-label="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-background/90 hover:text-foreground"
              aria-label="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
                  <button
                    onClick={() => { setMenuOpen(false); onDetails?.(file); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-popover-foreground hover:bg-accent"
                  >
                    <Eye className="h-3.5 w-3.5" /> Details
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDelete?.(file); }}
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

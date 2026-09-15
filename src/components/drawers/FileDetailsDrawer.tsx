"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Download, Trash2, Edit2, Check, Lock, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyUrlButton } from "@/components/shared/CopyUrlButton";
import { StepUpVerificationDialog } from "@/components/security/StepUpVerificationDialog";
import { formatBytes, formatDate } from "@/lib/utils";
import type { FileRecord, StepUpMethod } from "@/types";

interface FileDetailsDrawerProps {
  file: FileRecord | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (file: FileRecord) => void;
  onUpdate?: (file: FileRecord) => void;
}

export function FileDetailsDrawer({
  file, open, onClose, onDelete, onUpdate,
}: FileDetailsDrawerProps) {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedUrlLoading, setSignedUrlLoading] = useState(false);
  const [stepUpInfo, setStepUpInfo] = useState<{
    allowedMethods: StepUpMethod[];
    reason: string;
  } | null>(null);
  const pendingVisibilityRef = useRef<"public" | "private" | null>(null);
  const pendingSignedFileIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (file) {
      setNewName(file.name);
      setSignedUrl(null);
    }
  }, [file]);

  const requestSignedUrl = useCallback(async () => {
    if (!file) return null;
    setSignedUrlLoading(true);
    try {
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
      setSignedUrl(data.signedUrl);
      return data.signedUrl || null;
    } finally {
      setSignedUrlLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (file && file.visibility === "private") {
      requestSignedUrl();
    }
  }, [file, file?.visibility, requestSignedUrl]);

  const handleRename = async () => {
    if (!file || !newName.trim() || newName === file.name) { setRenaming(false); return; }
    try {
      const res = await fetch("/api/files/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, name: newName.trim() }),
      });
      if (res.ok) onUpdate?.({ ...file, name: newName.trim() });
    } catch { /* silent */ }
    setRenaming(false);
  };

  const handleToggleFavorite = async () => {
    if (!file) return;
    try {
      const res = await fetch("/api/files/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, is_favorite: !file.is_favorite }),
      });
      if (res.ok) onUpdate?.({ ...file, is_favorite: !file.is_favorite });
    } catch { /* silent */ }
  };

  const handleToggleVisibility = async () => {
    if (!file) return;
    const newVis = file.visibility === "public" ? "private" : "public";
    try {
      const res = await fetch("/api/files/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, visibility: newVis }),
      });
      if (res.status === 403) {
        const data = await res.json();
        if (data.stepUpRequired) {
          pendingVisibilityRef.current = newVis;
          setStepUpInfo({ allowedMethods: data.allowedMethods, reason: data.reason });
          return;
        }
      }
      if (res.ok) onUpdate?.({ ...file, visibility: newVis });
    } catch { /* silent */ }
  };

  const handleVisibilityStepUpVerified = async () => {
    if (!file) return;
    const newVis = pendingVisibilityRef.current;
    if (!newVis) return;
    try {
      const res = await fetch("/api/files/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, visibility: newVis }),
      });
      if (res.ok) onUpdate?.({ ...file, visibility: newVis });
    } catch { /* silent */ }
    setStepUpInfo(null);
    pendingVisibilityRef.current = null;
  };

  const handleSignedUrlStepUpVerified = async () => {
    const fileId = pendingSignedFileIdRef.current;
    if (!fileId || !file) return;
    try {
      const res = await fetch("/api/r2/signed-view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSignedUrl(data.signedUrl);
      }
    } catch { /* silent */ }
    setStepUpInfo(null);
    pendingSignedFileIdRef.current = null;
  };

  const handleStepUpVerified = () => {
    if (pendingVisibilityRef.current) {
      handleVisibilityStepUpVerified();
    } else if (pendingSignedFileIdRef.current) {
      handleSignedUrlStepUpVerified();
    } else {
      setStepUpInfo(null);
    }
  };

  const handleStepUpClose = () => {
    setStepUpInfo(null);
    pendingVisibilityRef.current = null;
    pendingSignedFileIdRef.current = null;
  };

  if (!open || !file) return null;

  const previewUrl = file.visibility === "private" ? signedUrl : file.public_url;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-card shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-medium text-foreground">File details</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent" aria-label="Close drawer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {file.file_type === "image" && previewUrl ? (
              <img src={previewUrl} alt={file.name} className="h-full w-full object-contain" />
            ) : file.file_type === "video" && previewUrl ? (
              <video src={previewUrl} controls className="h-full w-full" />
            ) : (
              <div className="text-center text-muted-foreground">
                <p className="text-sm">{file.mime_type}</p>
              </div>
            )}
            {file.visibility === "private" && (
              <div className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5">
                <Lock className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            {renaming ? (
              <div className="flex gap-2 mt-1">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                <Button size="sm" onClick={handleRename}><Check className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <button onClick={() => setRenaming(true)} className="text-muted-foreground hover:text-foreground" aria-label="Rename">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Original name</span>
              <p className="text-foreground truncate">{file.original_name}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">File type</span>
              <p className="text-foreground">{file.file_type}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">MIME type</span>
              <p className="text-foreground">{file.mime_type}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Size</span>
              <p className="text-foreground">{formatBytes(file.size)}</p>
            </div>
            {file.width && file.height && (
              <div>
                <span className="text-xs text-muted-foreground">Dimensions</span>
                <p className="text-foreground">{file.width} × {file.height}</p>
              </div>
            )}
            {file.duration_seconds && (
              <div>
                <span className="text-xs text-muted-foreground">Duration</span>
                <p className="text-foreground">{file.duration_seconds}s</p>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground">Uploaded</span>
              <p className="text-foreground">{formatDate(file.created_at)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Updated</span>
              <p className="text-foreground">{formatDate(file.updated_at)}</p>
            </div>
          </div>

          {file.visibility === "public" && file.public_url && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Public URL</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {file.public_url}
                </code>
                <CopyUrlButton url={file.public_url} />
              </div>
            </div>
          )}

          {file.visibility === "private" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Temporary access link</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {signedUrlLoading ? "Generating..." : signedUrl ? "Temporary link ready" : "Private file — no permanent URL"}
                </code>
                <CopyUrlButton
                  url=""
                  isPrivate
                  onRequestSignedUrl={requestSignedUrl}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Private files use temporary access links that expire after 15 minutes.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">R2 key</label>
            <code className="block truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground mt-1">
              {file.r2_key}
            </code>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Favorite</span>
              <button onClick={handleToggleFavorite} className={`text-sm font-medium ${file.is_favorite ? "text-foreground" : "text-muted-foreground"}`}>
                {file.is_favorite ? "Yes" : "No"}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">Visibility</span>
              <button onClick={handleToggleVisibility} className="text-sm font-medium text-foreground">
                {file.visibility}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {previewUrl && (
              <Button variant="outline" size="sm" onClick={() => window.open(previewUrl, "_blank")} className="flex-1">
                <Download className="h-3.5 w-3.5 mr-1" /> Download
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => onDelete?.(file)} className="flex-1">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <StepUpVerificationDialog
        open={!!stepUpInfo}
        onClose={handleStepUpClose}
        onVerified={handleStepUpVerified}
        allowedMethods={stepUpInfo?.allowedMethods || []}
        reason={stepUpInfo?.reason || ""}
      />
    </>
  );
}

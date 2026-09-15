"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X, Check, AlertCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import type { CategoryType, UploadFileItem } from "@/types";
import { DEFAULT_UPLOAD_LIMITS_MB, limitsFromSettings, type UploadLimitsMb } from "@/lib/upload-limits";

interface UploadModalProps {
  category: CategoryType;
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  folderId?: string | null;
}

const ACCEPT: Record<string, Record<string, string[]>> = {
  image: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
  video: { "video/*": [".mp4", ".webm", ".mov"] },
  document: {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "text/csv": [".csv"],
    "text/plain": [".txt"],
    "application/vnd.ms-powerpoint": [".ppt"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  },
  files: {
    "application/zip": [".zip"],
    "application/x-rar-compressed": [".rar"],
    "application/x-7z-compressed": [".7z"],
    "application/gzip": [".gz", ".tar.gz"],
    "application/x-tar": [".tar"],
    "application/x-bzip2": [".bz2"],
    "application/x-xz": [".xz"],
    "application/x-iso9660-image": [".iso"],
    "application/x-msdownload": [".exe"],
    "application/x-msi": [".msi"],
    "application/x-apple-diskimage": [".dmg"],
    "application/vnd.android.package-archive": [".apk"],
  },
};

const CATEGORY_LABEL: Record<CategoryType, string> = {
  image: "Images",
  video: "Videos",
  document: "Documents",
  files: "Files",
};

export function UploadModal({ category, open, onClose, onUploadComplete, folderId }: UploadModalProps) {
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const xhrRefs = useRef<Record<string, XMLHttpRequest>>({});
  // Configured upload limits, loaded from Settings. A ref mirrors the state so
  // the react-dropzone validator (created once) always reads current values.
  const [limits, setLimits] = useState<UploadLimitsMb>(DEFAULT_UPLOAD_LIMITS_MB);
  const limitsRef = useRef<UploadLimitsMb>(DEFAULT_UPLOAD_LIMITS_MB);

  useEffect(() => {
    if (open) {
      fetch("/api/security/settings").then((r) => r.ok && r.json()).then((d) => {
        if (d?.default_upload_visibility) setVisibility(d.default_upload_visibility);
        if (d) {
          const next = limitsFromSettings(d);
          limitsRef.current = next;
          setLimits(next);
        }
      }).catch(() => {});
    }
  }, [open]);

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: UploadFileItem[] = accepted.map((file) => ({
      file,
      id: uuidv4(),
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT[category],
    validator: (file) => {
      const maxMb = limitsRef.current[category];
      if (file.size > maxMb * 1024 * 1024) {
        return { code: "file-too-large", message: `File exceeds ${maxMb} MB limit.` };
      }
      return null;
    },
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = (item: UploadFileItem): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const presignRes = await fetch("/api/r2/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, fileName: item.file.name, fileSize: item.file.size, mimeType: item.file.type, visibility }),
        });
        if (!presignRes.ok) throw new Error((await presignRes.json()).error || "Failed to get upload URL");
        const { presignedUrl, r2Key, publicUrl } = await presignRes.json();

        const xhr = new XMLHttpRequest();
        xhrRefs.current[item.id] = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)));
          }
        };

        xhr.onload = async () => {
          // NOTE: this handler is async — a thrown error here would reject the
          // handler's own promise, not the executor, leaving the upload item
          // stuck on "uploading" forever. Always settle via resolve/reject.
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const metaRes = await fetch("/api/files/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: item.file.name, original_name: item.file.name, file_type: category, mime_type: item.file.type, size: item.file.size, r2_key: r2Key, public_url: publicUrl, visibility, folder_id: folderId ?? null }),
              });
              if (!metaRes.ok) {
                // Metadata write failed after the object was uploaded — roll back
                // the orphaned R2 object so it doesn't leak storage.
                await fetch("/api/r2/delete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ r2Key }),
                }).catch(() => {});
                delete xhrRefs.current[item.id];
                reject(new Error("Failed to save metadata"));
                return;
              }
              setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "success", progress: 100, publicUrl, r2Key } : f)));
              delete xhrRefs.current[item.id];
              resolve();
            } catch (metaErr) {
              delete xhrRefs.current[item.id];
              reject(metaErr instanceof Error ? metaErr : new Error("Failed to save metadata"));
            }
          } else {
            reject(new Error(`R2 upload failed (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", item.file.type);
        xhr.send(item.file);
      } catch (err) {
        reject(err);
      }
    });
  };

  const startUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    let completedCount = 0;

    for (const item of pending) {
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "uploading", progress: 0 } : f)));
      try {
        await uploadSingleFile(item);
        completedCount++;
      } catch (err) {
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : f)));
        delete xhrRefs.current[item.id];
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg !== "Upload cancelled") {
          toast.error(`Upload failed: ${msg}`);
        }
      }
    }

    if (completedCount > 0) { toast.success(`Uploaded ${completedCount} file${completedCount > 1 ? "s" : ""}`); onUploadComplete(); }
  };

  const cancelUpload = (id: string) => {
    const xhr = xhrRefs.current[id];
    if (xhr) {
      xhr.abort();
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "pending", progress: 0 } : f)));
    }
  };

  const handleClose = () => {
    Object.values(xhrRefs.current).forEach((xhr) => xhr.abort());
    xhrRefs.current = {};
    setFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={`Upload to ${CATEGORY_LABEL[category]}`}>
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive ? "border-ring bg-accent" : "border-border hover:border-muted-foreground"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-foreground">Drop files here</p>
          ) : (
            <p className="text-sm text-muted-foreground">Drag & drop files here, or click to select</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Up to {limits[category]} MB per file</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "public" | "private")}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        {files.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {files.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-foreground">{item.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.file.size / 1024 / 1024).toFixed(1)} MB
                      {item.status === "uploading" && ` \u00B7 ${item.progress}%`}
                      {item.error && <span className="ml-2 text-destructive">{item.error}</span>}
                    </p>
                  </div>
                  {item.status === "pending" && (
                    <button onClick={() => removeFile(item.id)} className="text-muted-foreground hover:text-foreground" aria-label="Remove file">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === "uploading" && (
                    <button onClick={() => cancelUpload(item.id)} className="text-muted-foreground hover:text-foreground" aria-label="Cancel upload">
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                  {item.status === "success" && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                  {item.status === "error" && <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                </div>
                {item.status === "uploading" && (
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            {files.some((f) => f.status === "success") ? "Done" : "Cancel"}
          </Button>
          {files.some((f) => f.status === "uploading") && (
            <Button variant="destructive" onClick={() => {
              Object.values(xhrRefs.current).forEach((xhr) => xhr.abort());
              xhrRefs.current = {};
              setFiles((prev) => prev.map((f) => f.status === "uploading" ? { ...f, status: "pending", progress: 0 } : f));
            }}>
              Stop all uploads
            </Button>
          )}
          {files.some((f) => f.status === "pending") && (
            <Button onClick={startUpload}>
              Upload {files.filter((f) => f.status === "pending").length} file(s)
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

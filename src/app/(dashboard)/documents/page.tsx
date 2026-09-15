"use client";

import { useState, useEffect, useRef } from "react";
import { useFiles } from "@/lib/files/useFiles";
import { UploadModal } from "@/components/upload/UploadModal";
import { FileGrid } from "@/components/files/FileGrid";
import { FileList } from "@/components/files/FileList";
import { FileDetailsDrawer } from "@/components/drawers/FileDetailsDrawer";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { GridSkeleton, ListSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { SortSelect } from "@/components/shared/SortSelect";
import { StorageUsage } from "@/components/shared/StorageUsage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepUpVerificationDialog } from "@/components/security/StepUpVerificationDialog";
import { FolderSection } from "@/components/shared/FolderSection";
import { FileText, Upload, Search, Tags, Filter } from "lucide-react";
import { toast } from "sonner";
import type { FileRecord, SortOption, ViewMode, StepUpMethod } from "@/types";
import type { Tag } from "@/types";

export default function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>("list");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [drawerFile, setDrawerFile] = useState<FileRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);
  const [tagId, setTagId] = useState<string | undefined>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [stepUpInfo, setStepUpInfo] = useState<{
    allowedMethods: StepUpMethod[];
    reason: string;
  } | null>(null);
  const pendingDeleteRef = useRef<FileRecord | null>(null);

  const { files, total, loading, error, refetch } = useFiles({
    category: "document",
    query: debouncedQuery,
    sort,
    folder_id: folderId,
    tag_id: tagId,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetch("/api/tags").then((r) => r.ok && r.json()).then(setTags).catch(() => {});
  }, []);

  const filteredFiles = typeFilter
    ? files.filter((f) => {
        const mime = f.mime_type.toLowerCase();
        if (typeFilter === "pdf") return mime.includes("pdf");
        if (typeFilter === "doc") return mime.includes("word") || mime.includes("document");
        if (typeFilter === "xls") return mime.includes("excel") || mime.includes("spreadsheet");
        if (typeFilter === "txt") return mime.includes("text");
        if (typeFilter === "ppt") return mime.includes("presentation") || mime.includes("powerpoint");
        return true;
      })
    : files;

  const doDelete = async (id: string) => {
    const res = await fetch("/api/files/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.status === 403) {
      const data = await res.json();
      if (data.stepUpRequired) {
        pendingDeleteRef.current = deleteTarget;
        setStepUpInfo({ allowedMethods: data.allowedMethods, reason: data.reason });
        return null;
      }
    }
    if (!res.ok) throw new Error("Delete failed");
    return true;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await doDelete(deleteTarget.id);
      if (result === null) return;
      toast.success("File deleted.");
      refetch();
    } catch {
      toast.error("Delete failed. Please try again.");
    }
    setDeleteTarget(null);
  };

  const handleDeleteStepUpVerified = async () => {
    const target = pendingDeleteRef.current;
    if (!target) return;
    try {
      const result = await doDelete(target.id);
      if (result === null) return; // step-up still required, dialog re-opened
      toast.success("File deleted.");
      refetch();
    } catch {
      toast.error("Delete failed. Please try again.");
    }
    setStepUpInfo(null);
    setDeleteTarget(null);
    pendingDeleteRef.current = null;
  };

  const typeFilters = [
    { value: "", label: "All" },
    { value: "pdf", label: "PDF" },
    { value: "doc", label: "DOC/DOCX" },
    { value: "xls", label: "XLS/XLSX" },
    { value: "txt", label: "TXT" },
    { value: "ppt", label: "PPT/PPTX" },
  ];

  return (
    <div className="flex h-full gap-6">
      <aside className="hidden w-56 shrink-0 space-y-6 lg:block">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button onClick={() => setUploadOpen(true)} className="w-full gap-2">
          <Upload className="h-4 w-4" />
          Upload
        </Button>

        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <FileText className="h-3 w-3" /> File type
          </div>
          <div className="space-y-1">
            {typeFilters.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTypeFilter(tf.value)}
                className={`block w-full text-left text-sm px-2 py-1 rounded ${
                  typeFilter === tf.value
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-accent-foreground"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <FolderSection folderId={folderId} onFolderChange={setFolderId} />

        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
            <Tags className="h-3 w-3" /> Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => setTagId(tagId === t.id ? undefined : t.id)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  tagId === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <SortSelect value={sort} onChange={setSort} />
        <StorageUsage />
      </aside>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setShowMobileFilters(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card p-4 overflow-y-auto lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-foreground">Filters</span>
              <button onClick={() => setShowMobileFilters(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search documents" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">File type</p>
                <div className="space-y-1">
                  {typeFilters.map((tf) => (
                    <button key={tf.value} onClick={() => { setTypeFilter(tf.value); setShowMobileFilters(false); }}
                      className={`block w-full text-left text-sm px-2 py-1 rounded ${typeFilter === tf.value ? "bg-accent" : "text-muted-foreground"}`}>{tf.label}</button>
                  ))}
                </div>
              </div>
              <FolderSection folderId={folderId} onFolderChange={(id) => { setFolderId(id); setShowMobileFilters(false); }} />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <button key={t.id} onClick={() => setTagId(tagId === t.id ? undefined : t.id)}
                      className={`text-xs px-2 py-1 rounded-full border ${tagId === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{t.name}</button>
                  ))}
                </div>
              </div>
              <SortSelect value={sort} onChange={setSort} />
              <StorageUsage />
            </div>
          </div>
        </>
      )}

      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">{total} file{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:hidden">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <button onClick={() => setShowMobileFilters(true)} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent lg:hidden" aria-label="Filters">
              <Filter className="h-4 w-4" />
            </button>
            <ViewToggle view={view} onChange={setView} className="hidden sm:flex" />
            <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-1">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between sm:hidden">
          <SortSelect value={sort} onChange={setSort} />
          <ViewToggle view={view} onChange={setView} />
        </div>

        {loading ? (
          view === "grid" ? <GridSkeleton /> : <ListSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filteredFiles.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No documents stored yet."
            description="Store PDFs and important files in one clean library."
            action={
              <Button onClick={() => setUploadOpen(true)} variant="outline">
                Upload document
              </Button>
            }
          />
        ) : view === "grid" ? (
          <FileGrid
            files={filteredFiles}
            onDelete={setDeleteTarget}
            onDetails={setDrawerFile}
          />
        ) : (
          <FileList
            files={filteredFiles}
            onDelete={setDeleteTarget}
            onDetails={setDrawerFile}
          />
        )}
      </div>

      <UploadModal
        category="document"
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={refetch}
        folderId={folderId}
      />

      <FileDetailsDrawer
        file={drawerFile}
        open={!!drawerFile}
        onClose={() => setDrawerFile(null)}
        onDelete={(f) => { setDrawerFile(null); setDeleteTarget(f); }}
        onUpdate={(updated) => { setDrawerFile(updated); refetch(); }}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        fileName={deleteTarget?.name}
      />

      <StepUpVerificationDialog
        open={!!stepUpInfo}
        onClose={() => { setStepUpInfo(null); pendingDeleteRef.current = null; }}
        onVerified={handleDeleteStepUpVerified}
        allowedMethods={stepUpInfo?.allowedMethods || []}
        reason={stepUpInfo?.reason || ""}
      />
    </div>
  );
}

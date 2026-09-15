"use client";

import { useState, useEffect, useRef } from "react";
import { FolderClosed, FolderPlus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import type { Folder } from "@/types";

interface FolderSectionProps {
  folderId: string | null | undefined;
  onFolderChange: (id: string | null | undefined) => void;
}

interface FolderWithCount extends Folder {
  file_count: number;
}

export function FolderSection({ folderId, onFolderChange }: FolderSectionProps) {
  const [folders, setFolders] = useState<FolderWithCount[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const fetchFolders = async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) setFolders(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (creating && createInputRef.current) createInputRef.current.focus();
  }, [creating]);

  useEffect(() => {
    if (renaming && renameInputRef.current) renameInputRef.current.focus();
  }, [renaming]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewName("");
      setCreating(false);
      await fetchFolders();
      toast.success("Folder created");
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: renameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      setRenaming(null);
      await fetchFolders();
      toast.success("Folder renamed");
    } catch {
      toast.error("Failed to rename folder");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/folders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setDeleting(null);
      if (folderId === id) onFolderChange(undefined);
      await fetchFolders();
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") { e.preventDefault(); action(); }
    if (e.key === "Escape") { setCreating(false); setRenaming(null); setNewName(""); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FolderClosed className="h-3 w-3" /> Folders
        </div>
        <button
          onClick={() => { setCreating(true); setNewName(""); }}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Create folder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onFolderChange(undefined)}
          className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${
            folderId === undefined
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-accent-foreground"
          }`}
        >
          <span className="truncate">All</span>
          <span className="shrink-0 text-xs tabular-nums">{folders.reduce((s, f) => s + f.file_count, 0)}</span>
        </button>

        {folders.map((f) => (
          <div key={f.id} className="group relative">
            {renaming === f.id ? (
              <div className="flex items-center gap-1 px-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, () => handleRename(f.id))}
                  className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm text-foreground"
                  maxLength={255}
                />
                <button onClick={() => handleRename(f.id)} className="text-green-500 hover:text-green-400"><Check className="h-3.5 w-3.5" /></button>
                <button onClick={() => setRenaming(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : deleting === f.id ? (
              <div className="flex items-center justify-between rounded px-2 py-1 text-sm">
                <span className="text-xs text-destructive">Delete?</span>
                <div className="flex gap-1">
                  <button onClick={() => handleDelete(f.id)} className="text-destructive hover:text-destructive/80"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleting(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onFolderChange(f.id)}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${
                  folderId === f.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-accent-foreground"
                }`}
              >
                <span className="truncate">{f.name}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-xs tabular-nums">{f.file_count}</span>
                  <span className="hidden group-hover:flex items-center gap-0.5">
                    <span
                      onClick={(e) => { e.stopPropagation(); setRenaming(f.id); setRenameValue(f.name); }}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Rename folder"
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setDeleting(f.id); }}
                      className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="Delete folder"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}

        {creating && (
          <div className="flex items-center gap-1 px-1">
            <input
              ref={createInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleCreate)}
              placeholder="Folder name"
              className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-sm text-foreground placeholder:text-muted-foreground"
              maxLength={255}
            />
            <button onClick={handleCreate} className="text-green-500 hover:text-green-400"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => { setCreating(false); setNewName(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

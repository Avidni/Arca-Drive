"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fileName?: string;
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, fileName }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onConfirm(); onClose(); } catch { /* handled by caller */ } finally { setDeleting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Delete file">
      <p className="text-sm text-muted-foreground">
        Are you sure you want to delete{" "}
        <span className="font-medium text-foreground">{fileName || "this file"}</span>?
        This action cannot be undone. The file will be permanently removed from both R2 storage and your library.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete permanently"}
        </Button>
      </div>
    </Dialog>
  );
}

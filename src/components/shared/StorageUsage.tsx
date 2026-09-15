"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/utils";
import { calculateStorageSummary } from "@/lib/files/storage";
import type { StorageSummary } from "@/types";
import { HardDrive } from "lucide-react";

export function StorageUsage() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: files } = await supabase.from("files").select("file_type, size").eq("user_id", user.id);
      if (files) setSummary(calculateStorageSummary(files));
    }
    load();
  }, []);

  if (!summary) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <HardDrive className="h-3 w-3" />
        Storage
      </div>
      <p className="text-sm font-medium text-foreground">{formatBytes(summary.total)}</p>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Images</span><span>{formatBytes(summary.images)}</span></div>
        <div className="flex justify-between"><span>Videos</span><span>{formatBytes(summary.videos)}</span></div>
        <div className="flex justify-between"><span>Documents</span><span>{formatBytes(summary.documents)}</span></div>
        <div className="flex justify-between"><span>Files</span><span>{formatBytes(summary.files)}</span></div>
      </div>
    </div>
  );
}

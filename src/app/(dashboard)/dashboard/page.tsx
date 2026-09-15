"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/utils";
import { Image, Film, FileText, FileArchive, HardDrive } from "lucide-react";
import type { StorageSummary } from "@/types";

export default function DashboardPage() {
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function loadStorage() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: files } = await supabase.from("files").select("file_type, size").eq("user_id", user.id);
      if (files) {
        const summary: StorageSummary = { total: 0, images: 0, videos: 0, documents: 0, files: 0, imageCount: 0, videoCount: 0, documentCount: 0, fileCount: 0 };
        for (const f of files) {
          summary.total += f.size;
          if (f.file_type === "image") { summary.images += f.size; summary.imageCount++; }
          else if (f.file_type === "video") { summary.videos += f.size; summary.videoCount++; }
          else if (f.file_type === "document") { summary.documents += f.size; summary.documentCount++; }
          else if (f.file_type === "files") { summary.files += f.size; summary.fileCount++; }
        }
        setStorage(summary);
      }
      setLoading(false);
    }
    loadStorage();
  }, []);

  const categories = [
    { key: "images", title: "Images", description: "Photos, graphics, and visual assets", href: "/images", icon: Image, count: storage?.imageCount ?? 0, size: storage?.images ?? 0 },
    { key: "videos", title: "Videos", description: "Clips, recordings, and motion content", href: "/videos", icon: Film, count: storage?.videoCount ?? 0, size: storage?.videos ?? 0 },
    { key: "documents", title: "Documents", description: "PDFs, spreadsheets, and text files", href: "/documents", icon: FileText, count: storage?.documentCount ?? 0, size: storage?.documents ?? 0 },
    { key: "files", title: "Files", description: "Archives, executables, and disk images", href: "/files", icon: FileArchive, count: storage?.fileCount ?? 0, size: storage?.files ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select a category to browse and manage your files.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link key={cat.key} href={cat.href}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:border-ring hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h2 className="text-lg font-medium text-foreground">{cat.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{cat.count} {cat.count === 1 ? "file" : "files"}</span>
                <span>{formatBytes(cat.size)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <HardDrive className="h-4 w-4" />
          Storage used
        </div>
        {loading ? (
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
        ) : (
          <p className="mt-1 text-2xl font-semibold text-foreground">{storage ? formatBytes(storage.total) : "0 B"}</p>
        )}
        {storage && storage.total > 0 && (
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span>Images: {formatBytes(storage.images)}</span>
            <span>Videos: {formatBytes(storage.videos)}</span>
            <span>Documents: {formatBytes(storage.documents)}</span>
            <span>Files: {formatBytes(storage.files)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import type { FileRecord, SortOption, ViewMode } from "@/types";

interface UseFilesOptions {
  category: string;
  query?: string;
  folder_id?: string | null;
  tag_id?: string;
  visibility?: string;
  is_favorite?: boolean;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export function useFiles(options: UseFilesOptions) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("category", options.category);
      if (options.query) params.set("query", options.query);
      if (options.folder_id !== undefined) params.set("folder_id", options.folder_id ?? "");
      if (options.tag_id) params.set("tag_id", options.tag_id);
      if (options.visibility) params.set("visibility", options.visibility);
      if (options.is_favorite !== undefined) params.set("is_favorite", String(options.is_favorite));
      if (options.sort) params.set("sort", options.sort);
      params.set("page", String(options.page || 1));
      params.set("limit", String(options.limit || 50));

      const res = await fetch(`/api/files/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch files");

      const data = await res.json();
      setFiles(data.files);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [options.category, options.query, options.folder_id, options.tag_id, options.visibility, options.is_favorite, options.sort, options.page, options.limit]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, total, loading, error, refetch: fetchFiles };
}

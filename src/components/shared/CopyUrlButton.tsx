"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Link, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyUrlButtonProps {
  url: string;
  size?: "sm" | "default" | "lg";
  isPrivate?: boolean;
  onRequestSignedUrl?: () => Promise<string | null>;
}

export function CopyUrlButton({ url, size = "sm", isPrivate, onRequestSignedUrl }: CopyUrlButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (isPrivate) {
      if (onRequestSignedUrl) {
        setLoading(true);
        try {
          const signedUrl = await onRequestSignedUrl();
          if (signedUrl) {
            await navigator.clipboard.writeText(signedUrl);
            toast.success("Temporary link copied.");
          }
        } catch {
          toast.error("Could not create temporary link.");
        } finally {
          setLoading(false);
        }
      } else {
        toast.error("Private files do not have permanent public URLs.");
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied.");
    } catch {
      toast.error("Could not copy URL.");
    }
  };

  if (isPrivate && !onRequestSignedUrl) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground" title="Private files do not have permanent public URLs">
        <Link className="h-3 w-3" />
        Private
      </span>
    );
  }

  return (
    <Button variant="ghost" size={size} onClick={handleCopy} disabled={loading} aria-label={isPrivate ? "Create temporary link" : "Copy public URL"}>
      {loading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : isPrivate ? <Link className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

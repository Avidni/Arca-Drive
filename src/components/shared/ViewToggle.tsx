"use client";

import { Grid3X3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex items-center rounded-lg border border-border bg-background p-0.5", className)}>
      <button
        onClick={() => onChange("grid")}
        className={cn("rounded-md p-1.5 transition-colors", view === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
        aria-label="Grid view"
      >
        <Grid3X3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange("list")}
        className={cn("rounded-md p-1.5 transition-colors", view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}

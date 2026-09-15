"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download, Copy } from "lucide-react";
import { CopyUrlButton } from "@/components/shared/CopyUrlButton";
import type { FileRecord } from "@/types";

interface ImageLightboxProps {
  files: FileRecord[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({ files, currentIndex, onClose, onNavigate }: ImageLightboxProps) {
  const file = files[currentIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && currentIndex < files.length - 1) onNavigate(currentIndex + 1);
    },
    [onClose, onNavigate, currentIndex, files.length]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
        aria-label="Close lightbox"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Navigation */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < files.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div className="flex max-h-[90vh] max-w-[90vw] items-center justify-center">
        <img
          src={file.public_url || ""}
          alt={file.name}
          className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
        />
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2">
        <span className="text-sm text-white">
          {currentIndex + 1} of {files.length}
        </span>
        <CopyUrlButton url={file.public_url || ""} />
        <button
          onClick={() => file.public_url && window.open(file.public_url, "_blank")}
          className="rounded-lg p-1.5 text-white hover:bg-white/20"
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

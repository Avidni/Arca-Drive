"use client";

import { Select } from "@/components/ui/select";
import type { SortOption } from "@/types";

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const options = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_az", label: "Name A–Z" },
  { value: "largest", label: "Largest" },
  { value: "smallest", label: "Smallest" },
  { value: "file_type", label: "File type" },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      options={options}
      aria-label="Sort files"
    />
  );
}

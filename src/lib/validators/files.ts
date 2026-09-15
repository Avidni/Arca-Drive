import { z } from "zod";

export const presignSchema = z.object({
  category: z.enum(["image", "video", "document", "files"]),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
  visibility: z.enum(["public", "private"]).default("public"),
});

export const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  original_name: z.string().min(1).max(255),
  file_type: z.enum(["image", "video", "document", "files"]),
  mime_type: z.string().min(1),
  size: z.number().positive(),
  r2_key: z.string().min(1),
  public_url: z.string().nullable().optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  folder_id: z.string().uuid().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration_seconds: z.number().int().positive().nullable().optional(),
});

export const updateFileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  is_favorite: z.boolean().optional(),
});

export const deleteFileSchema = z.object({
  id: z.string().uuid(),
});

export const searchSchema = z.object({
  category: z.enum(["image", "video", "document", "files"]).optional(),
  query: z.string().optional(),
  folder_id: z.string().uuid().nullable().optional(),
  tag_id: z.string().uuid().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  is_favorite: z.coerce.boolean().optional(),
  sort: z
    .enum(["newest", "oldest", "name_az", "largest", "smallest", "file_type"])
    .default("newest"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export const deleteFolderSchema = z.object({
  id: z.string().uuid(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const deleteTagSchema = z.object({
  id: z.string().uuid(),
});

export const addFileTagSchema = z.object({
  file_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

export const removeFileTagSchema = z.object({
  file_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

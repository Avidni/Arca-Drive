export interface FileRecord {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  original_name: string;
  file_type: "image" | "video" | "document" | "files";
  mime_type: string;
  size: number;
  r2_key: string;
  public_url: string | null;
  visibility: "public" | "private";
  is_favorite: boolean;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface FileTag {
  file_id: string;
  tag_id: string;
}

export interface StorageSummary {
  total: number;
  images: number;
  videos: number;
  documents: number;
  files: number;
  imageCount: number;
  videoCount: number;
  documentCount: number;
  fileCount: number;
}

export type SortOption = "newest" | "oldest" | "name_az" | "largest" | "smallest" | "file_type";

export type ViewMode = "grid" | "list";

export type CategoryType = "image" | "video" | "document" | "files";

export interface PresignResponse {
  presignedUrl: string;
  r2Key: string;
  publicUrl: string | null;
}

export interface UploadFileItem {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  publicUrl?: string;
  r2Key?: string;
}

export interface UserSecuritySettings {
  user_id: string;
  require_mfa_for_sensitive_actions: boolean;
  require_mfa_for_private_files: boolean;
  require_email_otp_for_sensitive_actions: boolean;
  default_upload_visibility: "public" | "private";
  created_at: string;
  updated_at: string;
}

export interface MfaFactor {
  id: string;
  friendly_name: string | null | undefined;
  factor_type: "totp" | "phone" | "webauthn";
  status: "verified" | "unverified";
  created_at: string;
  updated_at: string;
}

export type StepUpMethod = "totp" | "email_otp";

export interface SignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
}

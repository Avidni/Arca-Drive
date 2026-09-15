function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    if (typeof window !== "undefined") return "";
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getPublicEnv() {
  return {
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Arca Drive",
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    MAX_IMAGE_UPLOAD_MB: parseInt(process.env.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB || "25"),
    MAX_VIDEO_UPLOAD_MB: parseInt(process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB || "500"),
    MAX_DOCUMENT_UPLOAD_MB: parseInt(process.env.NEXT_PUBLIC_MAX_DOCUMENT_UPLOAD_MB || "50"),
    MAX_FILES_UPLOAD_MB: parseInt(process.env.NEXT_PUBLIC_MAX_FILES_UPLOAD_MB || "500"),
  };
}

export function getServerEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    R2_ACCOUNT_ID: requireEnv("R2_ACCOUNT_ID"),
    R2_ACCESS_KEY_ID: requireEnv("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: requireEnv("R2_SECRET_ACCESS_KEY"),
    R2_BUCKET_NAME: requireEnv("R2_BUCKET_NAME"),
    R2_ENDPOINT: requireEnv("R2_ENDPOINT"),
    R2_PUBLIC_BASE_URL: requireEnv("R2_PUBLIC_BASE_URL"),
  };
}

-- Arca Upload Limits
-- Move per-category upload limits out of environment variables and into
-- per-user settings so they can be configured in the app and enforced
-- server-side. Run after 00003_security_settings.sql.

alter table public.user_security_settings
  add column if not exists max_image_upload_mb integer not null default 25
    check (max_image_upload_mb between 1 and 10240),
  add column if not exists max_video_upload_mb integer not null default 500
    check (max_video_upload_mb between 1 and 10240),
  add column if not exists max_document_upload_mb integer not null default 50
    check (max_document_upload_mb between 1 and 10240),
  add column if not exists max_files_upload_mb integer not null default 500
    check (max_files_upload_mb between 1 and 10240);

-- Arca Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Folders table
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid null references public.folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Files table
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid null references public.folders(id) on delete set null,
  name text not null,
  original_name text not null,
  file_type text not null check (file_type in ('image', 'video', 'document', 'files')),
  mime_type text not null,
  size bigint not null check (size >= 0),
  r2_key text not null unique,
  public_url text null,
  visibility text not null check (visibility in ('public', 'private')),
  is_favorite boolean not null default false,
  width integer null,
  height integer null,
  duration_seconds integer null,
  checksum text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tags table
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

-- File-Tags join table
create table if not exists public.file_tags (
  file_id uuid not null references public.files(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (file_id, tag_id)
);

-- Indexes
create index if not exists idx_files_user_id on public.files(user_id);
create index if not exists idx_files_user_type on public.files(user_id, file_type);
create index if not exists idx_files_created on public.files(user_id, created_at desc);
create index if not exists idx_files_folder on public.files(user_id, folder_id);
create index if not exists idx_files_visibility on public.files(user_id, visibility);
create index if not exists idx_files_favorite on public.files(user_id, is_favorite);
create index if not exists idx_files_name on public.files(name);
create index if not exists idx_files_original_name on public.files(original_name);
create index if not exists idx_files_mime on public.files(mime_type);

create index if not exists idx_folders_user on public.folders(user_id);
create index if not exists idx_folders_parent on public.folders(user_id, parent_id);

create index if not exists idx_tags_user on public.tags(user_id);
create index if not exists idx_tags_name on public.tags(name);

create index if not exists idx_file_tags_tag on public.file_tags(tag_id);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at
  before update on public.files
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.folders
  for each row execute function public.handle_updated_at();

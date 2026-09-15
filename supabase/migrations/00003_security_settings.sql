-- Arca Security Settings
-- Run after RLS policies

-- User security settings table
create table if not exists public.user_security_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  require_mfa_for_sensitive_actions boolean not null default false,
  require_mfa_for_private_files boolean not null default false,
  require_email_otp_for_sensitive_actions boolean not null default false,
  default_upload_visibility text not null default 'public' check (default_upload_visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.user_security_settings enable row level security;

create policy "Users can view own security settings"
  on public.user_security_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own security settings"
  on public.user_security_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own security settings"
  on public.user_security_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own security settings"
  on public.user_security_settings for delete
  using (auth.uid() = user_id);

-- Updated_at trigger
create trigger set_updated_at
  before update on public.user_security_settings
  for each row execute function public.handle_updated_at();

-- Index
create index if not exists idx_security_settings_user on public.user_security_settings(user_id);

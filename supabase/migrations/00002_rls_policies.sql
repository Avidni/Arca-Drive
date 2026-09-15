-- Arca RLS Policies
-- Run after initial schema

-- Enable RLS on all tables
alter table public.files enable row level security;
alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.file_tags enable row level security;

-- Files policies
create policy "Users can view own files"
  on public.files for select
  using (auth.uid() = user_id);

create policy "Users can insert own files"
  on public.files for insert
  with check (auth.uid() = user_id);

create policy "Users can update own files"
  on public.files for update
  using (auth.uid() = user_id);

create policy "Users can delete own files"
  on public.files for delete
  using (auth.uid() = user_id);

-- Folders policies
create policy "Users can view own folders"
  on public.folders for select
  using (auth.uid() = user_id);

create policy "Users can insert own folders"
  on public.folders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own folders"
  on public.folders for update
  using (auth.uid() = user_id);

create policy "Users can delete own folders"
  on public.folders for delete
  using (auth.uid() = user_id);

-- Tags policies
create policy "Users can view own tags"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- File-Tags policies
create policy "Users can view own file tags"
  on public.file_tags for select
  using (
    exists (
      select 1 from public.files
      where files.id = file_tags.file_id
        and files.user_id = auth.uid()
    )
  );

create policy "Users can insert own file tags"
  on public.file_tags for insert
  with check (
    exists (
      select 1 from public.files
      where files.id = file_tags.file_id
        and files.user_id = auth.uid()
    )
    and
    exists (
      select 1 from public.tags
      where tags.id = file_tags.tag_id
        and tags.user_id = auth.uid()
    )
  );

create policy "Users can delete own file tags"
  on public.file_tags for delete
  using (
    exists (
      select 1 from public.files
      where files.id = file_tags.file_id
        and files.user_id = auth.uid()
    )
  );

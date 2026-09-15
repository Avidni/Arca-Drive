-- Add 'files' to the file_type CHECK constraint
alter table public.files drop constraint if exists files_file_type_check;
alter table public.files add constraint files_file_type_check
  check (file_type in ('image', 'video', 'document', 'files'));

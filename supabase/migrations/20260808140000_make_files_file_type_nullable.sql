-- supabase/migrations/20260808140000_make_files_file_type_nullable.sql
-- ============================================================
-- files.file_type كانت NOT NULL — بس الفرونت إند بيعتبر نوع الملف
-- اختياري (تمامًا متل tag بمستوى Item). نخليها nullable عشان تتوافق.
-- ============================================================

alter table public.files
  alter column file_type drop not null;
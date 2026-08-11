-- supabase/migrations/20260810150000_restrict_user_permissions_to_chief_dev.sql

drop policy if exists "Only chief or permitted admins can grant" on public.user_permissions;

create policy "Only chief or developer can grant"
on public.user_permissions
for all
using (
  (public.is_chief(auth.uid()) or public.is_developer(auth.uid()))
  and auth.uid() <> user_id
  and not public.is_chief(user_id)
  and not public.is_developer(user_id)
)
with check (
  (public.is_chief(auth.uid()) or public.is_developer(auth.uid()))
  and auth.uid() <> user_id
  and not public.is_chief(user_id)
  and not public.is_developer(user_id)
);

-- SELECT policy ("Users can view own permissions") تبقى كما هي، بدون تغيير.
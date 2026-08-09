-- supabase/migrations/20260809150000_shares_platform_with.sql
--
-- هل actor وtarget يشتركوا بأي منصة (مش منصة محددة زي is_platform_member)؟
-- مستخدمة لتقييد تكليف التاسكات: أدمن ثانوي بس يقدر يكلّف عضو موجود معه
-- بمنصة مشتركة — الشيف أدمن/الديفيلوبر متجاوزين هالفحص أصلاً (بيشوفوا
-- الكل)، فما في داعي نكررهم هون.

create or replace function public.shares_platform_with(p_actor_id uuid, p_target_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.platform_team_members a
    join public.platform_team_members b on a.platform_id = b.platform_id
    where a.member_id = p_actor_id and b.member_id = p_target_id
  );
$$;
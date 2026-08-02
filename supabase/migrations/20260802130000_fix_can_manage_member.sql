-- =====================================================================
-- Migration 007: مطابقة can_manage_member مع hierarchy.ts
--
-- الدالة انكتبت بمايجريشن 002، قبل ما يوجد is_developer (إجا بـ 005).
-- فصار عندنا مصدرين للقواعد بيتناقضوا:
--   hierarchy.ts يقول "مسموح"  →  الأكشن يمرّر  →  RLS ترفض
--
-- ثغرتين اتصلحوا هون:
--   1. الـ Developer ما كان معترف فيه كـ actor — كان بينحسب أدمن ثانوي
--      عادي، فما يقدر يتحكم بأي أدمن تاني.
--   2. الـ Developer ما كان محمي كـ target — أي أدمن ثانوي كان يقدر
--      يوقّفه أو يغيّر دوره.
-- =====================================================================

create or replace function public.can_manage_member(actor uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    actor <> target                                  -- محدش يدير نفسه
    and not public.is_chief(target)                  -- الـ Chief ما بينداره — حتى من Developer
    and not public.is_developer(target)              -- ولا الـ Developer
    and (
      public.is_developer(actor)                     -- الـ Developer يدير الكل
      or public.is_chief(actor)                      -- والـ Chief كمان
      or (
        public.is_admin(actor)
        and exists (                                 -- الأدمن الثانوي: members بس
          select 1 from public.profiles
          where id = target and access_role = 'member'
        )
      )
    );
$function$;

-- migration: 20260803120100_get_daily_verse.sql
-- المكان: supabase/migrations/20260803120100_get_daily_verse.sql
-- شغّلها بـ: supabase db push (بعد ما تشغّل السكريبت وتتأكد الجدول فيه بيانات)

create or replace function public.get_daily_verse()
returns table (
  id int,
  surah_number smallint,
  ayah_number smallint,
  surah_name_ar text,
  surah_name_en text,
  arabic_text text
)
language sql
stable
as $$
  select id, surah_number, ayah_number, surah_name_ar, surah_name_en, arabic_text
  from public.daily_verses
  order by id
  offset (
    extract(doy from (now() at time zone 'Asia/Riyadh'))::int
    % (select count(*) from public.daily_verses)
  )
  limit 1;
$$;

grant execute on function public.get_daily_verse() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- تجربة بالـ SQL Editor بعد التشغيل:
--
--   select * from get_daily_verse();
--
-- لازم ترجّع صف واحد، ونفس الصف بالظبط لو شغّلتها كذا مرة
-- بنفس اليوم (التاريخ محسوب بتوقيت مكة/الرياض مش توقيت الزائر).
-- ─────────────────────────────────────────────────────────────
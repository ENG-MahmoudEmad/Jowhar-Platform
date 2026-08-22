-- supabase/migrations/20260822000000_chat_channel_image_and_emoji_whitelist.sql

-- ============================================================
-- Chat Feature — Migration 5/N
-- صورة القناة + قائمة الإيموجي المسموحة على مستوى القناة (Chief/Developer فقط)
-- ============================================================

-- ------------------------------------------------------------
-- 1) صورة القناة
-- ------------------------------------------------------------
alter table public.chat_channels
  add column image_url text;

comment on column public.chat_channels.image_url is
  'رابط صورة القناة (Supabase Storage). null = يعرض الحرف الأول من الاسم كأيقونة افتراضية.';


-- ------------------------------------------------------------
-- 2) قائمة الإيموجي المسموحة للتفاعلات — على مستوى القناة بالكامل
--    (مش لكل عضو لحاله). null = الافتراضي (المجموعة الأساسية الثمانية
--    بالواجهة). فقط Chief/Developer يقدروا يعدّلوها.
-- ------------------------------------------------------------
alter table public.chat_channels
  add column allowed_reaction_emojis text[];

comment on column public.chat_channels.allowed_reaction_emojis is
  'قائمة الإيموجي المسموح استخدامها كتفاعلات بهاي القناة. null = الافتراضي الثابت بالواجهة. يعدّلها Chief/Developer فقط عبر update_chat_channel_emoji_whitelist().';


-- ------------------------------------------------------------
-- 3) دالة تحديث القناة (صورة) — حصراً super admin
-- ------------------------------------------------------------
create or replace function public.update_chat_channel_image(
  p_channel_id uuid,
  p_image_url text
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception 'تعديل صورة القناة حصري بالشيف أدمن والديفيلوبر';
  end if;

  update public.chat_channels
  set image_url = p_image_url
  where id = p_channel_id;
end;
$$;


-- ------------------------------------------------------------
-- 4) دالة تحديث قائمة الإيموجي المسموحة — حصراً super admin
-- ------------------------------------------------------------
create or replace function public.update_chat_channel_emoji_whitelist(
  p_channel_id uuid,
  p_emojis text[]
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception 'تحديد الإيموجي المسموحة حصري بالشيف أدمن والديفيلوبر';
  end if;

  if array_length(p_emojis, 1) > 20 then
    raise exception 'الحد الأقصى 20 إيموجي لكل قناة';
  end if;

  update public.chat_channels
  set allowed_reaction_emojis = p_emojis
  where id = p_channel_id;
end;
$$;


-- ------------------------------------------------------------
-- 5) حماية إضافية: منع التفاعل بإيموجي غير مسموح بالقناة
--    (فحص على مستوى قاعدة البيانات، مو بس بالواجهة)
-- ------------------------------------------------------------
create or replace function public.guard_chat_reaction_emoji_whitelist()
returns trigger
language plpgsql
security definer
as $$
declare
  v_allowed text[];
  v_channel_id uuid;
begin
  select channel_id into v_channel_id from public.chat_messages where id = new.message_id;

  select allowed_reaction_emojis into v_allowed
  from public.chat_channels where id = v_channel_id;

  -- null = القناة على الإعداد الافتراضي (المجموعة الأساسية بالواجهة) —
  -- ما في قيد إضافي بقاعدة البيانات بهالحالة، الواجهة نفسها بتعرض
  -- بس المجموعة الافتراضية. لو الشيف أدمن حدد قائمة صراحة، نفرضها هون.
  if v_allowed is not null and not (new.emoji = any(v_allowed)) then
    raise exception 'هذا الإيموجي غير مسموح بهذه القناة';
  end if;

  return new;
end;
$$;

create trigger trg_guard_chat_reaction_emoji_whitelist
  before insert on public.chat_message_reactions
  for each row execute function public.guard_chat_reaction_emoji_whitelist();
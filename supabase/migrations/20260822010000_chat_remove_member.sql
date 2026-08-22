-- supabase/migrations/20260822010000_chat_remove_member.sql

-- ============================================================
-- Chat Feature — Migration 6/N
-- إزالة عضو من قناة — حصراً Chief/Developer (كانت ناقصة)
-- ============================================================

create or replace function public.remove_chat_channel_member(
  p_channel_id uuid,
  p_member_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_chat_super_admin(auth.uid()) then
    raise exception 'إزالة أعضاء القنوات حصري بالشيف أدمن والديفيلوبر';
  end if;

  delete from public.chat_channel_members
  where channel_id = p_channel_id and member_id = p_member_id;

  -- ننضّف أي بقايا خاصة فيه بهاي القناة (إشراف، تقييدات) لو انطرد
  delete from public.chat_channel_moderators
  where channel_id = p_channel_id and member_id = p_member_id;

  delete from public.chat_member_restrictions
  where channel_id = p_channel_id and member_id = p_member_id;
end;
$$;
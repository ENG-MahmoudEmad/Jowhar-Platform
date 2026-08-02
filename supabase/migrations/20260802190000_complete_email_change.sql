-- =====================================================================
-- Migration 013: إقفال طلب تغيير الإيميل بعد التأكيد
--
-- التدفق ثلاث خطوات، وكانت الثالثة بلا مسؤول:
--   1. العضو يطلب            → pending_admin
--   2. الأدمن يوافق          → pending_email_verification
--   3. العضو يضغط الرابط     → ??? ما في شي بيقفل الصف
--
-- فالطلب كان بيضل "بانتظار التأكيد" للأبد حتى بعد ما الإيميل اشتغل.
-- =====================================================================

-- الحالة الثالثة. الرفض ما إله حالة عن قصد — الطلب المرفوض بينحذف.
alter type public.email_change_status add value if not exists 'completed';

-- ---------------------------------------------------------------------
-- إقفال الطلب لما الإيميل الفعلي يطابق المطلوب
-- ---------------------------------------------------------------------

/*
  بتُنادى من `src/app/auth/confirm/route.ts` بعد نجاح التحقق.
  المقارنة مع `auth.users.email` هي مصدر الحقيقة الوحيد: ما بنعتمد على
  إن الرابط اللي انضغط هو رابط تغيير إيميل، لأن نفس المسار بيخدم
  تأكيد التسجيل واستعادة كلمة السر كمان.

  آمنة للاستدعاء المتكرر — لو ما في طلب مطابق، ما بتعمل شي.
*/
create or replace function public.complete_email_change(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_updated integer;
begin
  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    return false;
  end if;

  update public.email_change_requests
     set status = 'completed'
   where user_id = p_user_id
     and status = 'pending_email_verification'
     and lower(new_email) = lower(v_email);

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

grant execute on function public.complete_email_change(uuid) to authenticated;
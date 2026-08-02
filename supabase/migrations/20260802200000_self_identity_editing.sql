-- =====================================================================
-- Migration 014: الـ Chief والـ Developer يعدّلوا هويتهم بنفسهم
--
-- المشكلة: `can_manage_member` بترفض النفس مطلقًا، فالـ Chief ما كان
-- يقدر يغيّر لونه ولا مسمّاه الوظيفي — ولا حدا تاني يقدر (لأنه محمي
-- كهدف). النتيجة: حقول ما إلها طريق تعديل إطلاقًا غير SQL يدوي.
--
-- الحل: نفصل "الهوية" عن "الإدارة" — نفس منطق فصل can_open عن can_manage.
--
--   هوية (لون، مسمّى، اسم، صورة)  →  آمنة، الـ Chief يعدّلها لنفسه
--   إدارة (دور، صلاحيات، إيقاف، حذف) → ممنوعة على النفس **قصدًا**
--
-- ليش الإدارة تضل ممنوعة حتى على النفس: لو الـ Chief نزّل نفسه لـ member
-- بالغلط، ما حدا بالمنصة يقدر يرجّعه — `is_chief` محمي بـ trigger وما
-- بينتغيّر إلا بـ SQL يدوي. بتقفل حالك برّا نظامك.
--
-- وبين الـ Chief والـ Developer: كلاهما محمي كهدف من الإدارة أصلاً
-- (`not is_chief(target) and not is_developer(target)`)، فما حدا فيهم
-- بيقدر يوقف التاني ولا يغيّر دوره ولا يحذفه. هذا مقصود ومطبّق من 007.
-- =====================================================================

create or replace function public.can_edit_identity(actor uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select
    -- الـ Chief والـ Developer يعدّلوا هوية أي حد **بما فيهم نفسهم**
    (
      (public.is_chief(actor) or public.is_developer(actor))
      and (
        actor = target
        -- بس ما يعدّلوا هوية بعض: كل واحد سيد هويته
        or (not public.is_chief(target) and not public.is_developer(target))
      )
    );
$function$;

grant execute on function public.can_edit_identity(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- تعديل حارس التعديل الذاتي ليسمح بالهوية للـ Chief/Developer
-- ---------------------------------------------------------------------

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_privileged boolean;
begin
  -- التعديلات الإدارية (من Server Actions بتفحص الصلاحيات) بتمر عادي
  if auth.uid() is null or auth.uid() <> new.id then
    return new;
  end if;

  v_privileged := public.is_chief(new.id) or public.is_developer(new.id);

  /*
    من هون وتحت: العضو بيعدّل على نفسه.
    الأعمدة الحساسة بترجع لقيمتها القديمة بصمت مهما بعت بالطلب — الرفض
    بـ exception كان بيكسر أي تحديث بريء بيبعت الصف كامل.
  */

  -- حقول الهوية: مسموحة للـ Chief/Developer، ممنوعة على غيرهم
  if not v_privileged then
    new.color        = old.color;
    new.job_title_en = old.job_title_en;
    new.job_title_ar = old.job_title_ar;
    new.lock_name    = old.lock_name;
    new.lock_avatar  = old.lock_avatar;
  end if;

  -- حقول الإدارة: ممنوعة على الجميع بدون استثناء، حتى الـ Chief
  new.access_role      = old.access_role;
  new.is_chief         = old.is_chief;
  new.is_developer     = old.is_developer;
  new.status           = old.status;
  new.is_suspended     = old.is_suspended;
  new.suspended_until  = old.suspended_until;
  new.suspended_by     = old.suspended_by;
  new.approved_by      = old.approved_by;
  new.approved_at      = old.approved_at;
  new.rejected_by      = old.rejected_by;
  new.rejected_at      = old.rejected_at;
  new.deleted_at       = old.deleted_at;

  /*
    الأقفال ما بتنطبق على الـ Chief/Developer: هم اللي بيحطوها أصلاً،
    وتطبيقها عليهم بيعني إنهم يقدروا يقفلوا حالهم بلا مفتاح.
  */
  if not v_privileged then
    if old.lock_name and
       (new.first_name is distinct from old.first_name
        or new.last_name is distinct from old.last_name) then
      raise exception 'name_locked';
    end if;

    if old.lock_avatar and new.avatar_url is distinct from old.avatar_url then
      raise exception 'avatar_locked';
    end if;
  end if;

  return new;
end;
$$;
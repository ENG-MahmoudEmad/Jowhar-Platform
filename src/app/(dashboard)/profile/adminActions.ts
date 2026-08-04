// src/app/(dashboard)/profile/adminActions.ts
// إجراءات الأدمن على بروفايل عضو تاني.
//
// ⚠️ نطاق هذا الملف محدود عن قصد: الدور والصلاحيات والإيقاف المؤقت
// كلهم بـ Admin Control **فقط**. تكرارهم هون كان بيخلق مكانين بيغيّروا
// نفس البيانات بقواعد مختلفة (أدمن ثانوي ممنوع يرقّي من Admin Control،
// بس مسموح من البروفايل) — نفس فخ درس #8 بس بالواجهة.
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { canEditRoles, canManage } from '@/lib/permissions/hierarchy';
import {
  requireManagedTarget,
  requireAdminActor,
  loadTarget,
} from '@/app/(dashboard)/adminControl/guards';

const CAPABILITY = 'members.manage';

/**
 * اللون والمسمّى الوظيفي = هوية العضو أمام الفريق كله، مش إجراء إداري
 * على شخص واحد: اللون بيلوّن باراته بكاليندر الداشبورد لكل الأعضاء
 * (القرار المعماري #7)، والمسمّى بيظهر بقائمة الأعضاء.
 * فحصريّان للـ Chief والـ Developer.
 *
 * ⚠️ مش `canManage`: هي بترفض النفس مطلقًا، فالـ Chief كان بيصير
 * ما يقدر يغيّر لونه — ولا حدا تاني يقدر (لأنه محمي كهدف)، يعني حقل
 * بلا طريق تعديل إطلاقًا.
 *
 * القاعدة (مطابقة لـ `can_edit_identity` بمايجريشن 014):
 *   • Chief/Developer → هوية أي عضو عادي، وهوية نفسه
 *   • ما يعدّلوا هوية بعض — كل واحد سيد هويته
 */
async function requireIdentityEditor(memberId: string) {
  const { supabase, actor } = await requireAdminActor();

  if (!canEditRoles(actor)) throw new Error('forbidden');

  if (memberId === actor.id) return { supabase, actor };

  const target = await loadTarget(supabase, memberId);
  if (target.isChief || target.isDeveloper) throw new Error('forbidden');
  if (!canManage(actor, target)) throw new Error('forbidden');

  return { supabase, actor };
}

// ===========================================================
// لون العضو
// ===========================================================
export async function setMemberColor(memberId: string, color: string) {
  const { supabase } = await requireIdentityEditor(memberId);

  // نفس فحص الـ constraint بالداتابيز — الرسالة هون أوضح من خطأ Postgres
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('invalid_color');

  const { error } = await supabase
    .from('profiles')
    .update({ color: color.toLowerCase() })
    .eq('id', memberId);

  if (error) throw new Error('color_update_failed');

  revalidatePath(`/profile/${memberId}`);
  revalidatePath('/adminControl');
}

// ===========================================================
// المسمّى الوظيفي
// ===========================================================
export async function setMemberJobTitle(memberId: string, en: string, ar: string) {
  const { supabase } = await requireIdentityEditor(memberId);

  const titleEn = en.trim();
  const titleAr = ar.trim();

  if (titleEn.length > 60 || titleAr.length > 60) throw new Error('title_too_long');

  /*
    الاتنين اختياريين: الواجهة بتعرض الموجود منهم كبديل عن الفاضي، فإجبار
    الأدمن يكتب مرتين لكل عضو عبء بلا مقابل. `null` مش '' عشان الفحص
    بالواجهة يكون `?? fallback` بدل فحص طول النص.
  */
  const { error } = await supabase
    .from('profiles')
    .update({
      job_title_en: titleEn || null,
      job_title_ar: titleAr || null,
    })
    .eq('id', memberId);

  if (error) throw new Error('job_title_update_failed');

  revalidatePath(`/profile/${memberId}`);
  revalidatePath('/adminControl');
}

// ===========================================================
// اسم العضو
// ===========================================================
/**
 * الـ Chief/Developer يعدّلوا اسم أي عضو — الحاجة عملية: عضو حاطط اسم
 * مخل أو بيلعب بالاسم كل يوم، فبيتصحّح ثم `lock_name` بتوقفه.
 *
 * ⚠️ القفل ما بينطبق على المُعدِّل: هو اللي بيحطه أصلاً، وتطبيقه عليه
 * بيعني إنه يقفل حاله بلا مفتاح. الـ trigger بالداتابيز بيفحص الأقفال
 * على **التعديل الذاتي** فقط، فما في تعارض.
 */
export async function setMemberName(memberId: string, firstName: string, lastName: string) {
  const { supabase } = await requireIdentityEditor(memberId);

  const first = firstName.trim();
  const last = lastName.trim();

  if (!first || !last) throw new Error('name_needs_two_parts');
  if (first.length > 40 || last.length > 40) throw new Error('name_too_long');

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: first, last_name: last })
    .eq('id', memberId);

  if (error) throw new Error('name_update_failed');

  revalidatePath(`/profile/${memberId}`);
  revalidatePath('/adminControl');
}

// ===========================================================
// صورة العضو
// ===========================================================
/**
 * الرفع نفسه بيصير من المتصفح لـ Storage (سياسة `avatars` بتتحقق من
 * الملكية عبر `can_edit_identity`)، وهالأكشن بس بيثبّت الرابط.
 *
 * الصورة جزء من الهوية، فبتمشي بنفس حارس اللون والمسمّى بالضبط.
 */
export async function setMemberAvatar(memberId: string, avatarUrl: string | null) {
  const { supabase } = await requireIdentityEditor(memberId);

  if (avatarUrl && !avatarUrl.startsWith('https://')) throw new Error('invalid_url');

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', memberId);

  if (error) throw new Error('avatar_update_failed');

  revalidatePath(`/profile/${memberId}`);
  revalidatePath('/adminControl');
}

// ===========================================================
// أقفال البروفايل
// ===========================================================
export async function toggleProfileLock(
  memberId: string,
  lock: 'name' | 'avatar',
  value: boolean
) {
  const { supabase } = await requireManagedTarget(memberId, CAPABILITY);

  /*
    مفتاح ديناميكي زي { [column]: value } كان بيولّد نوع { [x: string]: boolean }
    من ناحية TypeScript، حتى لو `column` فعليًا محصور باثنتين بس — TypeScript
    ما بيدمج computed key من union بكائن أدق من index signature عامة (وهذا
    مرفوض الآن بالنوع الصارم RejectExcessProperties اللي Supabase بيولّده).
    الفرعين الصريحين هون بيحلّوها بدون ما يغيّروا أي سلوك وقت التشغيل.
  */
  const { error } = lock === 'name'
    ? await supabase.from('profiles').update({ lock_name: value }).eq('id', memberId)
    : await supabase.from('profiles').update({ lock_avatar: value }).eq('id', memberId);

  if (error) throw new Error('lock_update_failed');

  revalidatePath(`/profile/${memberId}`);
}

// ===========================================================
// طلب تغيير الإيميل
// ===========================================================
export async function approveEmailChange(memberId: string) {
  const { supabase, actor } = await requireManagedTarget(memberId, CAPABILITY);

  const { data: request } = await supabase
    .from('email_change_requests')
    .select('id, new_email')
    .eq('user_id', memberId)
    .eq('status', 'pending_admin')
    .maybeSingle();

  if (!request) throw new Error('not_found');

  /*
    الموافقة مش تفعيل. `email_confirm: false` بتخلي Supabase يبعت رابط
    تأكيد للإيميل **الجديد**، والإيميل القديم بيضل فعّال لحد ما العضو
    يضغط الرابط — طبقة تانية بتتأكد إن الإيميل حقيقي وملكه فعلاً.
  */
  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(memberId, {
    email: request.new_email,
    email_confirm: false,
  });

  if (authError) throw new Error('email_update_failed');

  const { error } = await supabase
    .from('email_change_requests')
    .update({
      // مش 'completed': الأدمن وافق بس، والإيميل ما اتفعّل لحد ما العضو
      // يضغط رابط التأكيد. الحالة بتوصف المرحلة مش نتيجة المراجعة.
      status: 'pending_email_verification',
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', request.id);

  if (error) throw new Error('request_update_failed');

  revalidatePath(`/profile/${memberId}`);
}

export async function rejectEmailChange(memberId: string) {
  const { supabase, actor } = await requireManagedTarget(memberId, CAPABILITY);

  /*
    المواصفات: الرفض بيحذف الطلب — ما في حالة `rejected` بالـ enum أصلاً.
    `actor` مستعمل بس بالموافقة، فالرفض ما بيسجّل مراجعًا.
  */
  void actor;

  const { error } = await supabase
    .from('email_change_requests')
    .delete()
    .eq('user_id', memberId)
    .eq('status', 'pending_admin');

  if (error) throw new Error('reject_failed');

  // TODO: إشعار العضو برفض الطلب (بعد بناء جدول الإشعارات)
  revalidatePath(`/profile/${memberId}`);
}

// ===========================================================
// حذف الحساب (soft delete)
// ===========================================================
export async function softDeleteMember(memberId: string) {
  const { supabase } = await requireManagedTarget(memberId, CAPABILITY);

  /*
    Soft delete: الصف بيضل موجود لأن التاسكات والملاحظات مربوطة فيه،
    وحذفه بيضيّع تاريخ الشغل. الحذف النهائي بعد 90 يوم عبر
    `purge_deleted_profiles()` (بتحتاج pg_cron → Supabase Pro).
  */
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) throw new Error('delete_failed');

  // الحساب المحذوف ما بيقدر يسجل دخول من هلق
  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.signOut(memberId, 'global');
  } catch {
    // فشل طرد الجلسات ما بيلغي الحذف
  }

  revalidatePath('/adminControl');
}

// ===========================================================
// جلب بيانات إضافية بتحتاج service_role
// ===========================================================
/**
 * `last_sign_in_at` و `email` موجودين بـ `auth.users` فقط.
 * بيتجلبوا هون بدل ما ينخزنوا نسخة بـ `profiles` تصير بايتة.
 */
export async function getMemberAuthInfo(memberId: string): Promise<{
  email: string | null;
  lastSignInAt: string | null;
}> {
  await requireAdminActor();

  const adminClient = createAdminClient();
  const { data } = await adminClient.auth.admin.getUserById(memberId);

  return {
    email: data?.user?.email ?? null,
    lastSignInAt: data?.user?.last_sign_in_at ?? null,
  };
}
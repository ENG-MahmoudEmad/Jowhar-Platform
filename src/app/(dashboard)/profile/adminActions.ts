// src/app/(dashboard)/profile/adminActions.ts
// إجراءات الأدمن على بروفايل عضو تاني.
//
// ⚠️ نطاق هذا الملف محدود عن قصد: الدور والصلاحيات والإيقاف المؤقت
// كلهم بـ Admin Control **فقط**. تكرارهم هون كان بيخلق مكانين بيغيّروا
// نفس البيانات بقواعد مختلفة (أدمن ثانوي ممنوع يرقّي من Admin Control،
// بس مسموح من البروفايل) — نفس فخ درس #8 بس بالواجهة.
//
// الأفعال الحساسة (قفل/فك قفل، موافقة/رفض إيميل، حذف) بتسجّل بـ
// admin_audit_log عبر logAudit() (من guards.ts المشترك) — لو صار نزاع
// أو خطأ، بنعرف مين عمل شو وإمتى. اللون/المسمّى/الاسم/الصورة مش
// مسجّلين (هوية اعتيادية مش قرار إداري حساس).
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { canEditRoles, canManage } from '@/lib/permissions/hierarchy';
import {
  requireManagedTarget,
  requireAdminActor,
  loadTarget,
  logAudit,
} from '@/app/(dashboard)/adminControl/guards';

const CAPABILITY = 'members.manage';

/** أحرف إنجليزية فقط — بدون أرقام أو رموز أو مسافات داخلية. */
const NAME_PART_RE = /^[A-Za-z]+$/;

function capitalize(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

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
 * الشيف أدمن هو الوحيد المسموحله يترك last_name فاضية. هون بنجيب
 * is_chief من صف العضو الهدف نفسه (مش actor) — لأنه اللي عم يتعدّل
 * اسمه هو الـ memberId، مش الأدمن اللي عم يعدّل.
 */
export async function setMemberName(memberId: string, firstName: string, lastName: string) {
  const { supabase } = await requireIdentityEditor(memberId);

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('is_chief')
    .eq('id', memberId)
    .single();

  const isChief = targetProfile?.is_chief ?? false;

  const first = firstName.trim();
  const last = lastName.trim();

  if (!first) throw new Error('name_first_required');
  if (!NAME_PART_RE.test(first)) throw new Error('name_invalid_chars');
  if (first.length > 40) throw new Error('name_too_long');

  if (!last) {
    if (!isChief) throw new Error('name_last_required');
  } else {
    if (!NAME_PART_RE.test(last)) throw new Error('name_invalid_chars');
    if (last.length > 40) throw new Error('name_too_long');
  }

  const normFirst = capitalize(first);
  const normLast = last ? capitalize(last) : '';

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: normFirst, last_name: normLast })
    .eq('id', memberId);

  if (error) throw new Error('name_update_failed');

  revalidatePath(`/profile/${memberId}`);
  revalidatePath('/adminControl');
}

// ===========================================================
// صورة العضو
// ===========================================================
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
  const { supabase, actor } = await requireManagedTarget(memberId, CAPABILITY);

  const { error } = lock === 'name'
    ? await supabase.from('profiles').update({ lock_name: value }).eq('id', memberId)
    : await supabase.from('profiles').update({ lock_avatar: value }).eq('id', memberId);

  if (error) throw new Error('lock_update_failed');

  await logAudit(supabase, memberId, value ? `lock_${lock}_enabled` : `lock_${lock}_disabled`, {
    actor_id: actor.id,
  });

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

  const adminClient = createAdminClient();
  const { error: authError } = await adminClient.auth.admin.updateUserById(memberId, {
    email: request.new_email,
    email_confirm: false,
  });

  if (authError) throw new Error('email_update_failed');

  const { error } = await supabase
    .from('email_change_requests')
    .update({
      status: 'pending_email_verification',
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', request.id);

  if (error) throw new Error('request_update_failed');

  await logAudit(supabase, memberId, 'email_change_approved', {
    new_email: request.new_email,
  });

  revalidatePath(`/profile/${memberId}`);
}

export async function rejectEmailChange(memberId: string) {
  const { supabase, actor } = await requireManagedTarget(memberId, CAPABILITY);

  const { data: request } = await supabase
    .from('email_change_requests')
    .select('new_email')
    .eq('user_id', memberId)
    .eq('status', 'pending_admin')
    .maybeSingle();

  const { error } = await supabase
    .from('email_change_requests')
    .delete()
    .eq('user_id', memberId)
    .eq('status', 'pending_admin');

  if (error) throw new Error('reject_failed');

  await logAudit(supabase, memberId, 'email_change_rejected', {
    actor_id: actor.id,
    new_email: request?.new_email ?? null,
  });

  // TODO: إشعار العضو برفض الطلب (بعد بناء جدول الإشعارات)
  revalidatePath(`/profile/${memberId}`);
}

// ===========================================================
// حذف الحساب (soft delete)
// ===========================================================
export async function softDeleteMember(memberId: string) {
  const { supabase, actor } = await requireManagedTarget(memberId, CAPABILITY);

  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) throw new Error('delete_failed');

  await logAudit(supabase, memberId, 'member_soft_deleted', {
    actor_id: actor.id,
  });

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
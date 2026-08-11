// src/app/(dashboard)/adminControl/rolesActions.ts
// إدارة دور العضو وصلاحياته — كل عملية بتتفحص صلاحيات الـ actor من طرف السيرفر.
'use server';

import { revalidatePath } from 'next/cache';
import { canManage, canEditRoles } from '@/lib/permissions/hierarchy';
import { requireAdminActor, loadTarget, logAudit } from './guards';

// ===========================================================
// تغيير دور العضو (member ⇄ admin)
// ===========================================================
export async function setMemberRole(memberId: string, role: 'member' | 'admin') {
  const { supabase, actor } = await requireAdminActor();

  if (role !== 'member' && role !== 'admin') throw new Error('invalid_role');

  /*
    تغيير الدور حصري للـ Chief والـ Developer.
    السبب: لو سمحنا للأدمن الثانوي يرقّي عضو لـ admin، بيصير عاجز عن التحكم
    بنفس الشخص اللي رقّاه (القاعدة بتمنع أدمن يتحكم بأدمن) — يعني ترقية
    بالغلط ما إلها رجعة من طرفه.
  */
  if (!canEditRoles(actor)) throw new Error('forbidden');

  const target = await loadTarget(supabase, memberId);
  if (!canManage(actor, target)) throw new Error('forbidden');

  const { error } = await supabase
    .from('profiles')
    .update({ access_role: role })
    .eq('id', memberId);

  if (error) throw new Error('role_update_failed');

  // تنزيل لـ member بيصفّر كل الصلاحيات — عضو عادي ما بيحمل مفاتيح إدارية
  if (role === 'member') {
    await supabase.from('user_permissions').delete().eq('user_id', memberId);
  }

  await logAudit(supabase, memberId, 'role_changed', { new_role: role });

  revalidatePath('/adminControl');
}

// ===========================================================
// منح/سحب صلاحية واحدة
// ===========================================================
export async function togglePermission(
  memberId: string,
  permissionKey: string,
  granted: boolean
) {
  const { supabase, actor } = await requireAdminActor();

  // منح/سحب الصلاحيات حصري للـ Chief والـ Developer — نفس منطق تغيير الدور
  if (!canEditRoles(actor)) throw new Error('forbidden');

  const target = await loadTarget(supabase, memberId);
  if (!canManage(actor, target)) throw new Error('forbidden');

  // المفتاح لازم يكون موجود فعليًا بالـ Registry — يمنع حقن مفاتيح عشوائية
  const { data: permission } = await supabase
    .from('permissions')
    .select('key')
    .eq('key', permissionKey)
    .single();

  if (!permission) throw new Error('unknown_permission');

  if (granted) {
    const { error } = await supabase.from('user_permissions').insert({
      user_id: memberId,
      permission_key: permissionKey,
      granted_by: actor.id,
      granted_at: new Date().toISOString(),
    });
    if (error) throw new Error('grant_failed');
  } else {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', memberId)
      .eq('permission_key', permissionKey);
    if (error) throw new Error('revoke_failed');
  }

  await logAudit(supabase, memberId, granted ? 'permission_granted' : 'permission_revoked', {
    permission_key: permissionKey,
  });

  revalidatePath('/adminControl');
} 
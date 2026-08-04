// src/app/(dashboard)/dashboard/platformActions.ts
// إجراءات إدارة فرق الـ Platforms (كارت Members بالداشبورد).
// محمية بصلاحية platforms.manage (أو Chief/Developer ضمنيًا).
'use server';

import { requireAdminActor, hasCapability } from '@/app/(dashboard)/adminControl/guards';

const CAPABILITY = 'platforms.manage';

async function requirePlatformManager() {
  const { supabase, actor } = await requireAdminActor();
  if (!(await hasCapability(supabase, actor, CAPABILITY))) {
    throw new Error('forbidden');
  }
  return { supabase, actor };
}

// ===========================================================
// إضافة عضو لتصنيف معيّن داخل platform
// ===========================================================
export async function addMemberToPlatform(
  platformId: string,
  categoryId: string,
  memberId: string
) {
  const { supabase } = await requirePlatformManager();

  const { error } = await supabase
    .from('platform_team_members')
    .insert({ platform_id: platformId, category_id: categoryId, member_id: memberId });

  // unique(platform_id, member_id) بيرفض لو العضو أصلاً بمكان تاني بنفس
  // الـ platform — رسالة أوضح من خطأ Postgres الخام.
  if (error?.code === '23505') throw new Error('member_already_in_platform');
  if (error) throw new Error('add_member_failed');

}

// ===========================================================
// إزالة عضو من platform بالكامل (أي تصنيف كان فيه)
// ===========================================================
export async function removeMemberFromPlatform(platformId: string, memberId: string) {
  const { supabase } = await requirePlatformManager();

  const { error } = await supabase
    .from('platform_team_members')
    .delete()
    .eq('platform_id', platformId)
    .eq('member_id', memberId);

  if (error) throw new Error('remove_member_failed');

}

// ===========================================================
// نقل عضو لتصنيف تاني بنفس الـ platform
// ===========================================================
export async function moveMemberToCategory(
  platformId: string,
  memberId: string,
  toCategoryId: string
) {
  const { supabase } = await requirePlatformManager();

  const { error } = await supabase
    .from('platform_team_members')
    .update({ category_id: toCategoryId })
    .eq('platform_id', platformId)
    .eq('member_id', memberId);

  if (error) throw new Error('move_member_failed');

}

// ===========================================================
// إضافة تصنيف جديد
// ===========================================================
export async function addPlatformCategory(
  platformId: string,
  labelEn: string,
  labelAr: string
): Promise<{ id: string; labelEn: string; labelAr: string }> {
  const { supabase } = await requirePlatformManager();

  const en = labelEn.trim() || 'Category';
  const ar = labelAr.trim() || 'تصنيف';

  // التصنيف الجديد بيروح آخر القائمة — أعلى sort_order الحالي + 1
  const { data: existing } = await supabase
    .from('platform_team_categories')
    .select('sort_order')
    .eq('platform_id', platformId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('platform_team_categories')
    .insert({ platform_id: platformId, label_en: en, label_ar: ar, sort_order: nextOrder })
    .select('id, label_en, label_ar')
    .single();

  if (error || !data) throw new Error('add_category_failed');


  return { id: data.id, labelEn: data.label_en, labelAr: data.label_ar };
}

// ===========================================================
// تسمية تصنيف
// ===========================================================
export async function renamePlatformCategory(
  categoryId: string,
  labelEn: string,
  labelAr: string
) {
  const { supabase } = await requirePlatformManager();

  const en = labelEn.trim() || 'Category';
  const ar = labelAr.trim() || 'تصنيف';

  const { error } = await supabase
    .from('platform_team_categories')
    .update({ label_en: en, label_ar: ar })
    .eq('id', categoryId);

  if (error) throw new Error('rename_category_failed');

}

// ===========================================================
// حذف تصنيف (أعضاؤه بينحذفوا معه تلقائيًا بالـ cascade)
// ===========================================================
export async function deletePlatformCategory(categoryId: string) {
  const { supabase } = await requirePlatformManager();

  const { error } = await supabase
    .from('platform_team_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw new Error('delete_category_failed');

}
// src/app/(dashboard)/archive/guards.ts
// حراسات مشتركة لكل أكشنز الأرشيف.
// ⚠️ بدون 'use server' عن قصد — نفس سبب adminControl/guards.ts.

import { createClient } from '@/lib/supabase/server';
import { hasCapability } from '@/app/(dashboard)/adminControl/guards';
import type { Actor } from '@/lib/permissions/hierarchy';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** المستخدم الحالي — بدون شرط وصول خاص، أي عضو مقبول يقدر يتصفح الأرشيف. */
export async function requireArchiveActor(): Promise<{
  supabase: ServerClient;
  actor: Actor;
}> {
  const supabase = await createClient();

  /*
    ⚠️ getSession() مش getUser() هون بقصد: proxy.ts (middleware) أصلاً
    بيستدعي getUser() الحقيقي (رحلة شبكة فعلية لسيرفر Supabase Auth) على
    كل طلب صفحة، ويرفض أي جلسة غير صالحة قبل ما توصل هون. requireArchiveActor
    بينستدعى بكل مستوى تصفح بالأرشيف (منصة/عمل/قسم/عنصر/ملف)، فكانت رحلة
    شبكة مكررة بكل مستوى تنقّل — أهم مكان بالمشروع لهاد الإصلاح.
  */
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error('unauthenticated');

  const { data: row } = await supabase
    .from('profiles')
    .select('id, is_chief, is_developer, access_role')
    .eq('id', user.id)
    .single();

  if (!row) throw new Error('forbidden');

  const actor: Actor = {
    id: row.id,
    isDeveloper: row.is_developer,
    isChief: row.is_chief,
    accessRole: row.access_role,
  };

  return { supabase, actor };
}

/**
 * عضوية منصة معينة (طبقة ب بالتوثيق) — Chief/Developer يتخطون دايمًا،
 * بغض النظر عن عضويتهم الفعلية بـ platform_team_members.
 */
export async function isPlatformMember(
  supabase: ServerClient,
  actor: Actor,
  platformId: string
): Promise<boolean> {
  if (actor.isChief || actor.isDeveloper) return true;

  const { data } = await supabase
    .from('platform_team_members')
    .select('id')
    .eq('platform_id', platformId)
    .eq('member_id', actor.id)
    .maybeSingle();

  return Boolean(data);
}

/**
 * القرار المحسوم: عضوية المنصة شرط مسبق، وManage Archive بتحدد الصلاحيات جوا.
 * يستخدم لتعديل منصة موجودة (فيها platform_id فعلي).
 */
export async function canManageArchivePlatform(
  supabase: ServerClient,
  actor: Actor,
  platformId: string
): Promise<boolean> {
  if (!(await isPlatformMember(supabase, actor, platformId))) return false;
  return hasCapability(supabase, actor, 'archive.manage');
}

/** إضافة منصة جديدة — ما فيه platform_id بعد، فبس Manage Archive بدون شرط عضوية. */
export async function canCreatePlatform(
  supabase: ServerClient,
  actor: Actor
): Promise<boolean> {
  return hasCapability(supabase, actor, 'archive.manage');
}

/**
 * الحذف — محصور بمستوى الحساب فقط (Chief Admin / Developer)، غير قابل
 * للمنح إطلاقًا عبر user_permissions. متطابق قصدًا مع can_delete_archive()
 * بالداتابيز — أي تعديل هون لازم يقابله ميغريشن، والعكس.
 */
export function canDeleteArchive(actor: Actor): boolean {
  return actor.isChief || actor.isDeveloper;
}

export async function canCopyMoveArchivePlatform(
  supabase: ServerClient,
  actor: Actor,
  platformId: string
): Promise<boolean> {
  if (!(await isPlatformMember(supabase, actor, platformId))) return false;
  return hasCapability(supabase, actor, 'archive.copy_move');
}

/**
 * نفس canManageArchivePlatform، بس بيبلش من work_id ويحلّ platform_id تبعه
 * أول شي — لمستويات Section/Item يلي معاها work_id بس مش platform_id مباشرة.
 */
export async function canManageArchiveByWork(
  supabase: ServerClient,
  actor: Actor,
  workId: string
): Promise<boolean> {
  const { data: work } = await supabase
    .from('works')
    .select('platform_id')
    .eq('id', workId)
    .maybeSingle();

  if (!work) return false;
  return canManageArchivePlatform(supabase, actor, work.platform_id);
}
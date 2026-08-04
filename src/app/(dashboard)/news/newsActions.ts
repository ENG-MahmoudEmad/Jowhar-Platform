// src/app/(dashboard)/news/newsActions.ts
// إجراءات صفحة الأخبار. النشر محصور بصلاحية news.publish، بس اللايك
// مسموح لأي عضو مسجّل دخول — مش إجراء إداري.
'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdminActor, hasCapability } from '@/app/(dashboard)/adminControl/guards';

const CAPABILITY = 'news.publish';

async function requireNewsPublisher() {
  const { supabase, actor } = await requireAdminActor();
  if (!(await hasCapability(supabase, actor, CAPABILITY))) {
    throw new Error('forbidden');
  }
  return { supabase, actor };
}

/**
 * أي عضو مسجّل دخول (مش بس أدمن) — اللايك مش إجراء إداري، فما بيمرّ
 * عبر requireAdminActor() (يلي بيحصر الوصول بالأدمن أصلاً).
 */
async function requireAuthenticatedMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  return { supabase, userId: user.id };
}

// ===========================================================
// نشر خبر جديد
// ===========================================================
export interface CreateNewsPostInput {
  type: 'announcement' | 'update' | 'alert';
  titleEn: string;
  titleAr: string;
  body: string;
  /** رابط من Storage (أو خارجي) — الرفع نفسه صار بالفرونت قبل ما توصل هون. */
  imageUrl: string | null;
  /** فاضي = ينشر فورًا. لو بالمستقبل، الخبر "قادم" (بادج مخصوص). */
  publishAt: string | null;
  /** فاضي = ما بينتهي أبدًا. */
  expiresAt: string | null;
}

export async function createNewsPost(input: CreateNewsPostInput): Promise<{ id: number }> {
  const { supabase, actor } = await requireNewsPublisher();

  const titleEn = input.titleEn.trim();
  const titleAr = input.titleAr.trim();
  const body = input.body.trim();

  if (!titleEn || !titleAr || !body) throw new Error('invalid_input');
  if (titleEn.length > 200 || titleAr.length > 200) throw new Error('title_too_long');
  if (body.length > 5000) throw new Error('body_too_long');

  if (input.publishAt && input.expiresAt && new Date(input.expiresAt) <= new Date(input.publishAt)) {
    throw new Error('expiry_before_publish');
  }

  const { data, error } = await supabase
    .from('news_posts')
    .insert({
      type: input.type,
      title_en: titleEn,
      title_ar: titleAr,
      body,
      image_url: input.imageUrl,
      author_id: actor.id,
      publish_at: input.publishAt,
      expires_at: input.expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('post_create_failed');

  return { id: data.id };
}

// ===========================================================
// تبديل اللايك — أي عضو مسجّل دخول
// ===========================================================
export async function togglePostLike(postId: number): Promise<{ liked: boolean; likesCount: number }> {
  const { supabase } = await requireAuthenticatedMember();

  const { data, error } = await supabase
    .rpc('toggle_post_like', { p_post_id: postId })
    .single();

  if (error || !data) throw new Error('toggle_like_failed');

  return { liked: data.liked, likesCount: data.likes_count };
}
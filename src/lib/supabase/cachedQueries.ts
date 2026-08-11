// src/lib/supabase/cachedQueries.ts
// استعلامات مشتركة بين كل المستخدمين (مش شخصية) — آمن نكاشها لأن
// المحتوى نفسه لأي حد شافها بنفس اللحظة. أي بيانات مرتبطة بهوية
// الشخص (team progress, صلاحياته) ما بتنحط هون أبدًا.
//
// unstable_cache بيخزّن النتيجة 60 ثانية (revalidate)، وبيرتبط بـ tag
// عشان نقدر نلغيه فورًا (عبر updateTag بالـ Server Actions) لما البيانات
// فعليًا تتغيّر (مثلاً موافقة تاسك) بدل ما نستنى انتهاء الـ60 ثانية.
//
// ⚠️ service role (createAdminClient) بقصد، مش عميل anon عادي:
//   1. Next.js 16.3 بيمنع استخدام cookies() (عميل createClient() العادي)
//      جوا دالة مكاشة بـunstable_cache — الكوكيز "ديناميكية" وهذا يتعارض
//      مع فكرة كاش مشترك.
//   2. عميل anon بمفتاح anon بس (بدون جلسة) بيشتغل بدور 'anon' بقاعدة
//      البيانات — لو الـRPCs معطاة صلاحية تنفيذ لـ'authenticated' بس
//      (الحالة الشائعة)، الاستدعاء بينرفض بصمت وترجع النتيجة فاضية.
//   service role بيتخطى RLS والصلاحيات بالكامل، وآمن هون لأن البيانات
//   نفسها عامة أصلاً (لا فيها تخصيص حسب هوية الطالب).
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export const getCachedLeaderboard = unstable_cache(
  async (period: 'weekly' | 'monthly') => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period });
    if (error) console.error('get_leaderboard (cached) failed:', error.message);
    return data ?? [];
  },
  ['leaderboard'], // مفتاح أساسي — Next.js بيضيف الآرغيومنتس (period) تلقائيًا
  { revalidate: 60, tags: ['leaderboard'] }
);

export const getCachedDailyVerse = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_daily_verse');
    if (error) console.error('get_daily_verse (cached) failed:', error.message);
    return data ?? [];
  },
  ['daily-verse'],
  { revalidate: 60 * 60 } // آية اليوم بتتغيّر مرة يوميًا، فساعة كافية
);

export const getCachedStudioPulseStats = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_studio_pulse_stats');
    if (error) console.error('get_studio_pulse_stats (cached) failed:', error.message);
    return data ?? [];
  },
  ['studio-pulse-stats'],
  { revalidate: 60, tags: ['studio-pulse-stats'] }
);
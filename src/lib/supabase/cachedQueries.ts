// src/lib/supabase/cachedQueries.ts
// استعلامات مشتركة بين كل المستخدمين (مش شخصية) — آمن نكاشها لأن
// المحتوى نفسه لأي حد شافها بنفس اللحظة. أي بيانات مرتبطة بهوية
// الشخص (team progress, صلاحياته) ما بتنحط هون أبدًا.
//
// unstable_cache بيخزّن النتيجة 60 ثانية (revalidate)، وبيرتبط بـ tag
// عشان نقدر نلغيه فورًا لما البيانات فعليًا تتغيّر (مثلاً موافقة تاسك)
// بدل ما نستنى انتهاء الـ60 ثانية.

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const getCachedLeaderboard = unstable_cache(
  async (period: 'weekly' | 'monthly') => {
    const supabase = await createClient();
    const { data } = await supabase.rpc('get_leaderboard', { p_period: period });
    return data ?? [];
  },
  ['leaderboard'], // مفتاح أساسي — Next.js بيضيف الآرغيومنتس (period) تلقائيًا
  { revalidate: 60, tags: ['leaderboard'] }
);

export const getCachedDailyVerse = unstable_cache(
  async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc('get_daily_verse');
    return data ?? [];
  },
  ['daily-verse'],
  { revalidate: 60 * 60 } // آية اليوم بتتغيّر مرة يوميًا، فساعة كافية
);

export const getCachedStudioPulseStats = unstable_cache(
  async () => {
    const supabase = await createClient();
    const { data } = await supabase.rpc('get_studio_pulse_stats');
    return data ?? [];
  },
  ['studio-pulse-stats'],
  { revalidate: 60, tags: ['studio-pulse-stats'] }
);
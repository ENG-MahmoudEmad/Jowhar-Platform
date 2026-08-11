// src/lib/supabase/cachedQueries.ts
// استعلامات مشتركة بين كل المستخدمين (مش شخصية) — آمن نكاشها لأن
// المحتوى نفسه لأي حد شافها بنفس اللحظة. أي بيانات مرتبطة بهوية
// الشخص (team progress, صلاحياته) ما بتنحط هون أبدًا.
//
// unstable_cache بيخزّن النتيجة 60 ثانية (revalidate)، وبيرتبط بـ tag
// عشان نقدر نلغيه فورًا (عبر updateTag بالـ Server Actions) لما البيانات
// فعليًا تتغيّر (مثلاً موافقة تاسك) بدل ما نستنى انتهاء الـ60 ثانية.
//
// ⚠️ عميل بدون كوكيز بقصد: Next.js 16.3 بيمنع استخدام cookies() (اللي
// عميل createClient() العادي بيعتمد عليه) جوا دالة مكاشة بـunstable_cache
// — الكوكيز "ديناميكية" (خاصة بكل طلب) وهذا يتعارض مع فكرة كاش مشترك.
// بما إنه هاي البيانات مش شخصية أصلاً، ما محتاجين جلسة مستخدم لجلبها —
// عميل anon عادي (بدون SSR cookie handling) كافي وآمن.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { Database } from './database.types';

function createAnonClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const getCachedLeaderboard = unstable_cache(
  async (period: 'weekly' | 'monthly') => {
    const supabase = createAnonClient();
    const { data } = await supabase.rpc('get_leaderboard', { p_period: period });
    return data ?? [];
  },
  ['leaderboard'], // مفتاح أساسي — Next.js بيضيف الآرغيومنتس (period) تلقائيًا
  { revalidate: 60, tags: ['leaderboard'] }
);

export const getCachedDailyVerse = unstable_cache(
  async () => {
    const supabase = createAnonClient();
    const { data } = await supabase.rpc('get_daily_verse');
    return data ?? [];
  },
  ['daily-verse'],
  { revalidate: 60 * 60 } // آية اليوم بتتغيّر مرة يوميًا، فساعة كافية
);

export const getCachedStudioPulseStats = unstable_cache(
  async () => {
    const supabase = createAnonClient();
    const { data } = await supabase.rpc('get_studio_pulse_stats');
    return data ?? [];
  },
  ['studio-pulse-stats'],
  { revalidate: 60, tags: ['studio-pulse-stats'] }
);
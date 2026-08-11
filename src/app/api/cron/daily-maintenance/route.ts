// src/app/api/cron/daily-maintenance/route.ts
//
// بيستدعيه Vercel Cron مرة وحدة كل يوم (شوف vercel.json). بيجمع كل
// المهام الدورية اليومية بمكان واحد بدل ما كل مهمة تاخد route منفصل:
//
//   1. cleanup_old_notifications  — حذف إشعارات أقدم من 20 يوم
//   2. expire_stale_pending_accounts — تعليق/حذف حسابات pending قديمة
//
// نفس فلسفة الحماية المستخدمة بـ notify-news: محمي بـ CRON_SECRET،
// وأي طلب بدونه أو بقيمة غلط بينرفض فورًا (403).
//
// ⚠️ لو عندك أصلاً route منفصل بيستدعي expire_stale_pending_accounts،
// احذف الاستدعاء المكرر من هون أو من هناك — مش المفروض تتصفى مرتين.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  // ⚠️ service role مش anon key — نفس السبب بتاع notify-news: طلب
  // سيرفر-لسيرفر بلا جلسة مستخدم، والدوال SECURITY DEFINER أصلًا.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Record<string, { ok: boolean; error?: string }> = {};

  const { error: cleanupError } = await supabase.rpc('cleanup_old_notifications');
  results.cleanup_old_notifications = cleanupError
    ? { ok: false, error: cleanupError.message }
    : { ok: true };

  const { error: expireError } = await supabase.rpc('expire_stale_pending_accounts');
  results.expire_stale_pending_accounts = expireError
    ? { ok: false, error: expireError.message }
    : { ok: true };

  const hasFailure = Object.values(results).some((r) => !r.ok);
  if (hasFailure) {
    console.error('daily-maintenance had failures:', results);
    return NextResponse.json({ results }, { status: 500 });
  }

  return NextResponse.json({ results });
}
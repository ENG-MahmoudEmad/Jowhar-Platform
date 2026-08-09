// src/app/api/cron/notify-news/route.ts
//
// بيستدعيه Vercel Cron كل 5 دقايق (شوف vercel.json). بيلقط أي خبر
// مجدول (publish_at) وصل وقته ولسا notified_at فاضي، ويبعتله إشعار
// نشر للجميع — نفس الحدث يلي بيصير فورًا وقت الإضافة العادية، بس
// هون للأخبار يلي كانت مجدولة للمستقبل.
//
// محمي بـ CRON_SECRET: Vercel Cron بيبعته تلقائيًا بـ Authorization
// header لما تكون القيمة معرّفة بـ env vars — أي طلب بدونه أو بقيمة
// غلط بينرفض فورًا (403)، عشان محدا يقدر يستدعي الـ route من برا
// ويفجّر إشعارات مزيّفة.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  // ⚠️ service role مش anon key — هاي الدالة SECURITY DEFINER أصلًا
  // وما إلها RLS policy عامة، بس بنستخدم service role هون عشان الطلب
  // جاي من سيرفر-لسيرفر بلا جلسة مستخدم إطلاقًا.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc('notify_due_news_posts');

  if (error) {
    console.error('notify_due_news_posts failed:', error);
    return NextResponse.json({ error: 'rpc_failed' }, { status: 500 });
  }

  return NextResponse.json({ notified: data ?? 0 });
}
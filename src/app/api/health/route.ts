// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin'; // عدّل المسار حسب مشروعك

export const dynamic = 'force-dynamic'; // تجنب أي caching على هالـ route

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createAdminClient();

    // استعلام خفيف جداً: head:true يعني ما بيرجع صفوف، بس بيتأكد الاتصال شغال
    const { error, count } = await supabase
      .from('platforms')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'Unknown error',
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 503 } // Service Unavailable - هاد المهم لـ uptime monitors
    );
  }
}
// src/app/api/auth/forgot-password/route.ts
//
// ليش Route Handler وليس استدعاء مباشر من المتصفح؟
// لأن فحص "هل الحساب active؟" لازم يصير على السيرفر. لو صار بالمتصفح،
// أي حدا يفتح الـ Network tab ويعرف إذا الإيميل مسجل عندنا أو لأ
// (user enumeration).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// رد موحد لكل الحالات — نجح الإرسال أو لأ، نفس النص ونفس الـ status
const UNIFIED_RESPONSE = {
  message: 'إذا كان هذا الإيميل مسجلاً ومفعّلاً، سيصلك رابط استرجاع كلمة السر',
};

// حد أدنى لزمن الرد، لتقليل فرصة استنتاج النتيجة من فرق التوقيت
const MIN_RESPONSE_MS = 700;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  const settle = async () => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((r) => setTimeout(r, MIN_RESPONSE_MS - elapsed));
    }
    return NextResponse.json(UNIFIED_RESPONSE, { status: 200 });
  };

  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return settle();
    }

    // service_role: بيتخطى الـ RLS — لهيك هالمفتاح ما بينزل للمتصفح أبدًا
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // الدالة بترجع true بس لو: الحساب موجود + مؤكد + active
    // + غير موقوف + مرّت 10 دقائق على آخر طلب
    const { data: allowed, error } = await admin.rpc('request_password_reset', {
      p_email: email,
    });

    if (error || !allowed) {
      return settle();
    }

    const origin = new URL(request.url).origin;

    /*
      نوجّه مباشرة لـ /reset-password وليس لـ /auth/confirm.

      السبب: لما نطلب الاسترجاع من السيرفر (service_role)، Supabase بترجع
      التوكن بـ hash الرابط (#access_token=...). والـ hash المتصفح ما
      بيبعته للسيرفر إطلاقًا — فأي Route Handler رح يشوفه فاضي.
      الحل: صفحة /reset-password (client component) بتقرأ الـ hash بنفسها
      وبتنشئ الجلسة عن طريق supabase-js.
    */
    await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    return settle();
  } catch {
    // حتى الأخطاء غير المتوقعة بترجع نفس الرد — ما منكشف شي
    return settle();
  }
}
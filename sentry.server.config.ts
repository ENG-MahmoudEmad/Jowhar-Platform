// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://167b3ea6b1ca601073d3ea07dffb3012@o4511908884512768.ingest.de.sentry.io/4511908892573776",

  // 🆕 100% بالتطوير مفيد للاختبار، بس بالإنتاج بيستهلك الـquota المجاني
  // بسرعة لو صار استخدام فعلي — 0.2 (20%) عيّنة كافية لرصد الأنماط
  // العامة للأداء بدون ما تستهلك الحد الشهري بسرعة.
  tracesSampleRate: isProduction ? 0.2 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 🆕 حماية بيانات حساسة — مهم جدًا بمشروع فيه Server Actions بتتعامل
  // مع passwords، tokens، service_role key، وبيانات شخصية للأعضاء.
  dataCollection: {
    // ما نبعتش بيانات المستخدم التلقائية (IP, email) مع كل حدث —
    // بنكتفي بس بـuser.id لو حبينا نربطه يدويًا بمكان معين لاحقًا.
    userInfo: false,
    // ما نبعتش أجسام الطلبات (request/response bodies) — ممكن تحتوي
    // كلمات سر، tokens، أو بيانات شخصية حساسة بالـServer Actions.
    httpBodies: [],
  },

  // 🆕 فلتر أخير قبل الإرسال — طبقة حماية إضافية تتأكد ما في أي header
  // أو معلومة حساسة سربت رغم إعدادات dataCollection فوق.
  beforeSend(event) {
    // احذف أي authorization/cookie headers لو ظهرت بأي مكان بالـevent
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["Authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["Cookie"];
    }

    // حماية إضافية: لو رسالة الخطأ نفسها فيها كلمات مفتاحية حساسة
    // (زي service_role أو أي مفتاح API)، امسح الرسالة كاملة بدل ما
    // نخاطر بتسريبها — الأفضل تفقد تفاصيل خطأ نادر من إنك تسرّب مفتاح.
    const message = event.message ?? event.exception?.values?.[0]?.value ?? "";
    if (/service_role|SUPABASE_SERVICE_ROLE_KEY|api[_-]?key/i.test(message)) {
      event.message = "[redacted: possible sensitive data in error message]";
      if (event.exception?.values?.[0]) {
        event.exception.values[0].value = "[redacted]";
      }
    }

    return event;
  },
});
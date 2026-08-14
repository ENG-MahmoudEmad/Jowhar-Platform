// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://167b3ea6b1ca601073d3ea07dffb3012@o4511908884512768.ingest.de.sentry.io/4511908892573776",

  // 🆕 نفس منطق الملفات التانية — 20% بالإنتاج توفيرًا للـquota
  tracesSampleRate: isProduction ? 0.2 : 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 🆕 مفعّلة فعليًا بدل ما تكون بس تعليقات معلّقة — بالمتصفح خصوصًا،
  // ما نبعتش IP/email المستخدم تلقائيًا مع كل حدث.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  // 🆕 فلتر أخير — بالمتصفح احتمال تسريب headers أقل من السيرفر، بس
  // منع تسريب أي مفتاح/توكن لو ظهر بالغلط برسالة خطأ (مثلاً لو حد
  // console.log مفتاح مؤقتًا وقت التطوير ونسي يشيله).
  beforeSend(event) {
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
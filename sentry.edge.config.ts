// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://167b3ea6b1ca601073d3ea07dffb3012@o4511908884512768.ingest.de.sentry.io/4511908892573776",

  // 🆕 نفس منطق sentry.server.config.ts — 20% بالإنتاج توفيرًا للـquota
  tracesSampleRate: isProduction ? 0.2 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 🆕 مهم بشكل خاص هون — هاد الملف بيتحمل مع الـmiddleware (proxy.ts)
  // يلي بيلمس *كل* request جاي للموقع، يعني أكتر مكان معرّض يشوف
  // session cookies وheaders حساسة قبل حتى ما توصل للصفحة نفسها.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  // 🆕 نفس فلتر الحماية المستخدم بـsentry.server.config.ts — بالذات
  // إزالة أي session/auth cookie ممكن تكون التقطت من الـmiddleware.
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["Authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["Cookie"];
    }

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
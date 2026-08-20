// src/lib/pusher/server.ts

import PusherServer from 'pusher';

/*
  نسخة واحدة فقط تُستخدم بكل السيرفر (Server Actions / Route Handlers).
  القيم من متغيرات البيئة — لازم تكون موجودة بـ .env.local محلياً
  وبـ Vercel Environment Variables للنشر.
*/
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});
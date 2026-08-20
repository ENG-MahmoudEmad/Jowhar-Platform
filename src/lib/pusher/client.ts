// src/lib/pusher/client.ts

import PusherClient from 'pusher-js';

/*
  نسخة واحدة فقط بالمتصفح. بتتصل فورًا وقت الاستيراد — عادي، Pusher
  بيدير الاتصال والـ reconnect تلقائيًا بالخلفية.

  ⚠️ نفس الدرس المتعلّم من NotificationBell.tsx بخصوص Supabase Realtime:
  لازم ننتظر الجلسة الفعلية قبل أي عملية تحتاج هوية موثوقة. هون الفرق
  إنه Pusher (بالإعداد الأساسي البسيط) ما بيحتاج توكن مخصص للقنوات
  العامة — بس لما نضيف Presence Channels (لمعرفة المتواجدين فعليًا،
  لازم لميزة @here) رح نحتاج endpoint توثيق (authEndpoint) وقتها
  ننتبه لنفس مشكلة "القناة بتتصل قبل ما الجلسة تكون جاهزة".
*/
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
);

/*
  ⚠️ مهم لمنع تكرار الرسالة عند المرسل نفسه:
  Server Actions بترجع الرسالة الحقيقية مباشرة لصاحبها (الاستجابة
  العادية لـsendChatMessageAction)، والـPusher broadcast مسؤول بس عن
  توصيلها لبقية الأعضاء. عشان السيرفر يعرف "مين المرسل" ويستثنيه من
  الـtrigger، لازم socket_id فريد لكل تبويب متصفح مفتوح، نمرره مع كل
  Server Action متعلقة بالشات.
*/
export function getPusherSocketId(): string | undefined {
  return pusherClient.connection.socket_id;
}
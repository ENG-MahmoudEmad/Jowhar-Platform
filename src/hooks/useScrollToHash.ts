// src/hooks/useScrollToHash.ts
"use client";

import { useEffect } from 'react';

/**
 * يسكرول للعنصر اللي id تبعه بيطابق الـ hash بالرابط، وبيوهّجه لحظات.
 *
 * ليش DOM مباشر مش state/props: العنصر المستهدف غالبًا جوّا قائمة طويلة
 * (تاسكات، طلبات معلّقة) ما إلها داعي تعرف أي شي عن "هل أنا مسلّط عليّ
 * الضوء الآن" — تمرير هالمعلومة كـ prop لكل صف بيعني كل قائمة لازم
 * تحمل حالة highlight خاصة فيها. التلاعب المباشر بالـ DOM أبسط وما
 * بيغيّر بنية أي كومبوننت موجود، بس بيحتاج id مطابق فعليًا على العنصر.
 *
 * ما بيصير شي لو الـ hash مش موجود، أو العنصر مش موجود بالصفحة —
 * safe no-op بالحالتين (مثلاً إشعار قديم لعنصر انحذف).
 */
export function useScrollToHash(deps: React.DependencyList = []) {
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    // مهلة قصيرة تسمح للقائمة (لو جايّة من جلب async) تخلص رسمها أول
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const previousOutline = el.style.outline;
      const previousOutlineOffset = el.style.outlineOffset;
      const previousTransition = el.style.transition;

      el.style.transition = 'outline-color 0.3s ease';
      el.style.outline = '2px solid #458482';
      el.style.outlineOffset = '3px';
      el.style.borderRadius = el.style.borderRadius || '12px';

      const clear = setTimeout(() => {
        el.style.outline = previousOutline;
        el.style.outlineOffset = previousOutlineOffset;
        el.style.transition = previousTransition;
      }, 2200);

      return () => clearTimeout(clear);
    }, 120);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
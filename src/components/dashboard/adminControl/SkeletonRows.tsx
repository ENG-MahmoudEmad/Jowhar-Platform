// src/components/dashboard/adminControl/SkeletonRows.tsx
"use client";

import { memo } from 'react';

/**
 * صفوف وهمية أثناء الجلب.
 *
 * ليش skeleton مش "جارِ التحميل...": الوميض المزعج سببه إن الكارد بيعرض
 * "لا توجد تاسكات" ثم يقفز لقائمة كاملة — يعني بيقول معلومة غلط ثم يصحّحها.
 * الـ skeleton بيحجز نفس المساحة وبيوصل الرسالة الصحيحة: "في شي جاي".
 *
 * الارتفاع مطابق لصفوف الكاردين (64px) عشان ما يصير أي قفزة بالتخطيط
 * لحظة استبدال الوهمي بالحقيقي.
 */
const ROWS = [0, 1, 2, 3, 4];

function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="animate-pulse">
      {ROWS.slice(0, rows).map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 px-4 py-3 sm:px-5"
          style={{
            height: 64,
            borderBottom: i === rows - 1 ? 'none' : '1px solid var(--divider)',
            // الصفوف الأبعد أبهت — بتوحي إن القائمة بتكمل تحت
            opacity: 1 - i * 0.15,
          }}
        >
          <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--foreground-muted)] opacity-30" />
          <div className="min-w-0 flex-1">
            <div
              className="h-3 rounded bg-[var(--foreground-muted)] opacity-20"
              style={{ width: `${68 - i * 9}%` }}
            />
            <div
              className="mt-2 h-2 rounded bg-[var(--foreground-muted)] opacity-12"
              style={{ width: `${44 - i * 5}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(SkeletonRows);
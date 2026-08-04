// src/lib/priorityColors.ts
//
// مصدر واحد للحقيقة للون كل أولوية تاسك — مستخرج من PersonalCalendar.tsx.
// أي كومبوننت بيلوّن حسب priority لازم يستورد من هون، مش يعرّف نسخته الخاصة.
//
// TODO (تنظيف اختياري لاحقًا): بدّل التعريف المحلي بـ PersonalCalendar.tsx
// باستيراد من هاد الملف بدل التعريف المكرر.

export type TaskPriority = 'low' | 'medium' | 'high';

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#458482',
  medium: '#e0a740',
  high: '#ef4444',
};

const FALLBACK_PRIORITY_COLOR = '#458482';

/**
 * Safe lookup for when the raw value comes from the database as `text`
 * (via `priority::text` in an RPC) rather than the typed enum.
 */
export function getPriorityColor(priority: string | null | undefined): string {
  if (priority === 'low' || priority === 'medium' || priority === 'high') {
    return PRIORITY_COLORS[priority];
  }
  return FALLBACK_PRIORITY_COLOR;
}
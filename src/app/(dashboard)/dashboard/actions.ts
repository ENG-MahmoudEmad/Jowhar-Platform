// src/app/(dashboard)/dashboard/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';

export interface CalendarTaskRow {
  id: string;
  member_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
}

/**
 * يجيب تاسكات الكاليندر لمجموعة أعضاء بنطاق زمني معيّن.
 *
 * بيتنادى بس لما المستخدم يقلّب برّا النطاق الواسع اللي انجاب أصلًا مع
 * تحميل الصفحة (شهرين قبل وبعد اليوم) — مش بكل تنقّل بين الأسابيع/الشهور.
 * شوف useEffect بتاع توسيع النطاق بـ ProjectCalendar.tsx.
 */
export async function fetchCalendarTasksRange(
  memberIds: string[],
  startDate: string, // 'YYYY-MM-DD'
  endDate: string,   // 'YYYY-MM-DD'
): Promise<CalendarTaskRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_calendar_tasks', {
    p_member_ids: memberIds,
    p_start: startDate,
    p_end: endDate,
  });

  if (error) {
    console.error('fetchCalendarTasksRange failed:', error.message);
    return [];
  }

  return data ?? [];
}
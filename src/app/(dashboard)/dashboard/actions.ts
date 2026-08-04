// src/app/(dashboard)/dashboard/actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import type { LeaderEntry } from '@/components/dashboard/Leaderboard';

interface LeaderboardRow {
  rank: number;
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_url: string | null;
  score: number;
  tasks_completed: number;
}

/**
 * نفس تحويل get_leaderboard() المستخدم بـ page.tsx وقت التحميل الأول —
 * بس هون بيتنادى من الفرونت عند حدث Realtime (تاسك اتحوّل لـ done)،
 * عشان الترتيب يتحدّث لحظيًا بدون ما المستخدم يعمل refresh يدوي.
 */
export async function getLeaderboardEntries(period: 'weekly' | 'monthly'): Promise<LeaderEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period });

  if (error) {
    console.error('getLeaderboardEntries failed:', error.message);
    return [];
  }

  return ((data ?? []) as LeaderboardRow[]).map((row) => ({
    rank: row.rank as 1 | 2 | 3,
    id: row.id,
    name: row.name?.trim() || '—',
    initials: row.initials || '—',
    memberColor: row.color || '#0d9488',
    avatarUrl: row.avatar_url,
    score: row.score,
    tasksCompleted: row.tasks_completed,
  }));
}

export interface LeaderboardHistoryRow {
  member_id: string;
  name: string;
  initials: string;
  color: string;
  avatar_url: string | null;
  times_first: number;
  times_second: number;
  times_third: number;
  current_streak: number;
}

/**
 * بيانات قاعة الشهرة (كم مرة كان العضو أول/تاني/تالت + الستريك الحالي).
 * ثقيلة شوي (بتحسب كل فترة تاريخية) فبتتنادى بس لما المستخدم يفتح
 * الـ Popup فعليًا، مش مع كل تحميل للداشبورد.
 */
export async function getLeaderboardHistory(
  period: 'weekly' | 'monthly',
): Promise<LeaderboardHistoryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_leaderboard_history', {
    p_period: period,
  });

  if (error) {
    console.error('getLeaderboardHistory failed:', error.message);
    return [];
  }

  return data ?? [];
}
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
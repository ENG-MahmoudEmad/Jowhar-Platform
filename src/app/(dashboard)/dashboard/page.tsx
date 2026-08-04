// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPriorityColor } from '@/lib/priorityColors';

import TeamProgress, { type TeamMemberData } from '@/components/dashboard/TeamProgress';
import ProjectCalendar, { type CalendarMemberData, type CalendarTaskData } from '@/components/dashboard/ProjectCalendar';
import DeadlineCountdown, { type DeadlineData } from '@/components/dashboard/DeadlineCountdown';
import MembersCard       from '@/components/dashboard/MembersCard';
import StudioPulse       from '@/components/dashboard/StudioPulse';
import Leaderboard, { type LeaderEntry } from '@/components/dashboard/Leaderboard';
import { sortMembersForDisplay } from '@/lib/sortMembersForDisplay';

// شكل الصف الراجع من get_team_progress() بالظبط (migration 20260803120500)
type TeamProgressRow = {
  id: string;
  name: string;
  initials: string;
  job_title_en: string | null;
  job_title_ar: string | null;
  color: string;
  avatar_url: string | null;
  progress: number;
  active_tasks: number;
};

// شكل الصف الراجع من get_my_deadlines() بالظبط (migration 20260803120300)
type DeadlineRow = {
  id: string;
  title: string;
  priority: string;
  start_at: string;
  deadline_at: string;
  window_seconds: number;
};

// شكل الصف الراجع من get_leaderboard() بالظبط (migration 20260803120500)
type LeaderboardRow = {
  rank: number; // الـ RPC نفسها بترجع 1-3 بس بسبب LIMIT 3، بس TypeScript
                // ما بيعرف هيك من عمود int عادي — بنأكّدها يدويًا تحت.
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_url: string | null;
  score: number;
  tasks_completed: number;
};

// شكل الصف الراجع من get_calendar_tasks() بالظبط (migration 20260803120600)
type CalendarTaskRow = {
  id: string;
  member_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: teamProgressRows } = await supabase.rpc('get_team_progress');

  // تحويل شكل صف الداتابيز لشكل الـ props اللي الكومبوننت بيفهمه —
  // TeamProgress ما بيعرف شي عن أسماء أعمدة Supabase.
  const teamMembers: TeamMemberData[] = (teamProgressRows ?? []).map((row) => ({
    id: row.id,
    name: row.name?.trim() || '—',
    initials: row.initials || '—',
    role: row.job_title_en ?? '',
    roleAr: row.job_title_ar ?? '',
    color: row.color || '#0d9488',
    avatarUrl: row.avatar_url,
    progress: row.progress,
    tasksCount: row.active_tasks,
  }));

  const { data: deadlineRows } = await supabase.rpc('get_my_deadlines');

  const deadlines: DeadlineData[] = (deadlineRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    color: getPriorityColor(row.priority),
    deadlineAt: new Date(row.deadline_at).getTime(),
    windowMs: row.window_seconds * 1000,
  }));

  const [{ data: weeklyRows }, { data: monthlyRows }] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_period: 'weekly' }),
    supabase.rpc('get_leaderboard', { p_period: 'monthly' }),
  ]);

  const mapLeaderboardRow = (row: LeaderboardRow): LeaderEntry => ({
    rank: row.rank as 1 | 2 | 3, // مضمونة runtime بسبب row_number() + limit 3 بالـ RPC
    id: row.id,
    name: row.name?.trim() || '—',
    initials: row.initials || '—',
    memberColor: row.color || '#0d9488',
    avatarUrl: row.avatar_url,
    score: row.score,
    tasksCompleted: row.tasks_completed,
  });

  const weeklyEntries: LeaderEntry[] = (weeklyRows ?? []).map(mapLeaderboardRow);
  const monthlyEntries: LeaderEntry[] = (monthlyRows ?? []).map(mapLeaderboardRow);

  // ── Calendar ──────────────────────────────────────────────────────────
  // نفس قاعدة الترتيب المستخدمة بـ Team Progress بالظبط (مستخرجة لملف
  // مشترك) — المستخدم الحالي أول، والباقي أبجديًا، لحد 5.
  const calendarMembers: CalendarMemberData[] = sortMembersForDisplay(
    teamMembers.map((m) => ({ id: m.id, name: m.name, color: m.color, avatarUrl: m.avatarUrl, initials: m.initials })),
    user.id,
    5,
  );

  // نطاق واسع مرة وحدة (شهرين قبل وبعد اليوم) — التنقل العادي قريب من
  // اليوم ما بيحتاج ولا طلب شبكة إضافي. لو المستخدم قلّب أبعد من هيك،
  // fetchCalendarTasksRange (Server Action) بتجيب الباقي عند الحاجة بس.
  const today = new Date();
  const calendarRangeStart = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());
  const calendarRangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());

  const { data: calendarTaskRows } = await supabase.rpc('get_calendar_tasks', {
    p_member_ids: calendarMembers.map((m) => m.id),
    p_start: toISODate(calendarRangeStart),
    p_end: toISODate(calendarRangeEnd),
  });

  const calendarTasks: CalendarTaskData[] = (calendarTaskRows ?? []).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    title: row.title,
    start: row.start_date,
    end: row.end_date,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Team Progress */}
      <section>
        <TeamProgress members={teamMembers} currentUserId={user.id} />
      </section>

      {/* Calendar + Deadline — 2/3 + 1/3 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <ProjectCalendar
            members={calendarMembers}
            initialTasks={calendarTasks}
            initialRangeStart={toISODate(calendarRangeStart)}
            initialRangeEnd={toISODate(calendarRangeEnd)}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <DeadlineCountdown deadlines={deadlines} />
        </div>
      </section>

      {/* Members + Studio Pulse — 1/3 + 2/3 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1 flex flex-col">
          <MembersCard />
        </div>
        <div className="lg:col-span-2 flex flex-col h-full">
          <StudioPulse />
        </div>
      </section>

      <section>
        <Leaderboard weeklyEntries={weeklyEntries} monthlyEntries={monthlyEntries} />
      </section>

    </div>
  );
}
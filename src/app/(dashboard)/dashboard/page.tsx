// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPriorityColor } from '@/lib/priorityColors';

import TeamProgress, { type TeamMemberData } from '@/components/dashboard/TeamProgress';
import ProjectCalendar   from '@/components/dashboard/ProjectCalendar';
import DeadlineCountdown, { type DeadlineData } from '@/components/dashboard/DeadlineCountdown';
import MembersCard       from '@/components/dashboard/MembersCard';
import StudioPulse       from '@/components/dashboard/StudioPulse';
import Leaderboard, { type LeaderEntry } from '@/components/dashboard/Leaderboard';

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
  rank: 1 | 2 | 3;
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_url: string | null;
  score: number;
  tasks_completed: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // TODO: شيل الـ (as unknown as ...) بعد ما تولّد database.types.ts من جديد
  // ويشمل get_team_progress() — عندها رجّع .returns<TeamProgressRow[]>() القديمة.
  const { data: teamProgressRows } = await supabase.rpc('get_team_progress');
  const typedTeamProgressRows = teamProgressRows as unknown as TeamProgressRow[] | null;

  // تحويل شكل صف الداتابيز لشكل الـ props اللي الكومبوننت بيفهمه —
  // TeamProgress ما بيعرف شي عن أسماء أعمدة Supabase.
  const teamMembers: TeamMemberData[] = (typedTeamProgressRows ?? []).map((row) => ({
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

  // TODO: شيل الـ (as unknown as ...) بعد ما تولّد database.types.ts من جديد
  const { data: deadlineRows } = await supabase.rpc('get_my_deadlines');
  const typedDeadlineRows = deadlineRows as unknown as DeadlineRow[] | null;

  const deadlines: DeadlineData[] = (typedDeadlineRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    color: getPriorityColor(row.priority),
    deadlineAt: new Date(row.deadline_at).getTime(),
    windowMs: row.window_seconds * 1000,
  }));

  // TODO: شيل الـ (as unknown as ...) بعد ما تولّد database.types.ts من جديد
  const [{ data: weeklyRows }, { data: monthlyRows }] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_period: 'weekly' }),
    supabase.rpc('get_leaderboard', { p_period: 'monthly' }),
  ]);
  const typedWeeklyRows = weeklyRows as unknown as LeaderboardRow[] | null;
  const typedMonthlyRows = monthlyRows as unknown as LeaderboardRow[] | null;

  const mapLeaderboardRow = (row: LeaderboardRow): LeaderEntry => ({
    rank: row.rank,
    id: row.id,
    name: row.name?.trim() || '—',
    initials: row.initials || '—',
    memberColor: row.color || '#0d9488',
    avatarUrl: row.avatar_url,
    score: row.score,
    tasksCompleted: row.tasks_completed,
  });

  const weeklyEntries: LeaderEntry[] = (typedWeeklyRows ?? []).map(mapLeaderboardRow);
  const monthlyEntries: LeaderEntry[] = (typedMonthlyRows ?? []).map(mapLeaderboardRow);

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* Team Progress */}
      <section>
        <TeamProgress members={teamMembers} currentUserId={user.id} />
      </section>

      {/* Calendar + Deadline — 2/3 + 1/3 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <ProjectCalendar />
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
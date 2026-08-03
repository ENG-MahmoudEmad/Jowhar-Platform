// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

import TeamProgress, { type TeamMemberData } from '@/components/dashboard/TeamProgress';
import ProjectCalendar   from '@/components/dashboard/ProjectCalendar';
import DeadlineCountdown from '@/components/dashboard/DeadlineCountdown';
import MembersCard       from '@/components/dashboard/MembersCard';
import StudioPulse       from '@/components/dashboard/StudioPulse';
import Leaderboard       from '@/components/dashboard/Leaderboard';

// شكل الصف الراجع من get_team_progress() بالظبط (migration 20260803120200)
type TeamProgressRow = {
  id: string;
  name: string;
  initials: string;
  job_title_en: string | null;
  job_title_ar: string | null;
  color: string;
  progress: number;
  active_tasks: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: teamProgressRows } = await supabase
    .rpc('get_team_progress')
    .returns<TeamProgressRow[]>();

  // تحويل شكل صف الداتابيز لشكل الـ props اللي الكومبوننت بيفهمه —
  // TeamProgress ما بيعرف شي عن أسماء أعمدة Supabase.
  const teamMembers: TeamMemberData[] = (teamProgressRows ?? []).map((row) => ({
    id: row.id,
    name: row.name?.trim() || '—',
    initials: row.initials || '—',
    role: row.job_title_en ?? '',
    roleAr: row.job_title_ar ?? '',
    color: row.color || '#0d9488',
    progress: row.progress,
    tasksCount: row.active_tasks,
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
          <ProjectCalendar />
        </div>
        <div className="lg:col-span-1 flex flex-col">
          <DeadlineCountdown />
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
        <Leaderboard />
      </section>

    </div>
  );
}
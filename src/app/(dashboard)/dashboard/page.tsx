// src/app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPriorityColor } from '@/lib/priorityColors';

import TeamProgress, { type TeamMemberData } from '@/components/dashboard/TeamProgress';
import ProjectCalendar, { type CalendarMemberData, type CalendarTaskData } from '@/components/dashboard/ProjectCalendar';
import DeadlineCountdown, { type DeadlineData } from '@/components/dashboard/DeadlineCountdown';
import MembersCard, { type PlatformData, type RosterMemberData } from '@/components/dashboard/MembersCard';
import StudioPulse, { type DailyVerseData, type StudioPulseStatsData } from '@/components/dashboard/StudioPulse';
import Leaderboard, { type LeaderEntry } from '@/components/dashboard/Leaderboard';
import { sortMembersForDisplay } from '@/lib/sortMembersForDisplay';
import { hasCapability } from '@/app/(dashboard)/adminControl/guards';
import {
  getCachedLeaderboard,
  getCachedDailyVerse,
  getCachedStudioPulseStats,
} from '@/lib/supabase/cachedQueries';  

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

type DeadlineRow = {
  id: string;
  title: string;
  priority: string;
  start_at: string;
  deadline_at: string;
  window_seconds: number;
};

type LeaderboardRow = {
  rank: number;
  id: string;
  name: string;
  initials: string;
  color: string;
  avatar_url: string | null;
  score: number;
  tasks_completed: number;
};

type CalendarTaskRow = {
  id: string;
  member_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

type DailyVerseRow = {
  id: number;
  surah_number: number;
  ayah_number: number;
  surah_name_ar: string;
  surah_name_en: string;
  arabic_text: string;
};

type StudioPulseStatsRow = {
  tasks_completed_this_month: number;
  completion_rate_month_pct: number;
  completion_rate_overall_pct: number;
  most_active_member_id: string | null;
  most_active_member_name: string | null;
  most_active_member_initials: string | null;
  most_active_member_color: string | null;
  most_active_member_avatar_url: string | null;
  most_active_member_tasks_completed: number | null;
};

type PlatformMemberRow = {
  id: string;
  member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    color: string;
    avatar_url: string | null;
    job_title_en: string | null;
    job_title_ar: string | null;
  } | null;
};

type PlatformCategoryRow = {
  id: string;
  label_en: string;
  label_ar: string;
  sort_order: number;
  platform_team_members: PlatformMemberRow[];
};

type PlatformRow = {
  id: string;
  name_en: string;
  name_ar: string;
  color: string;
  thumbnail_url: string | null;
  platform_team_categories: PlatformCategoryRow[];
};

type RosterRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  color: string;
  avatar_url: string | null;
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  /*
    ⚠️ getSession() مش getUser() هون بقصد: proxy.ts (middleware) أصلاً
    بيستدعي getUser() الحقيقي (رحلة شبكة فعلية لسيرفر Supabase Auth) على
    كل طلب صفحة، ويرفض أي جلسة غير صالحة قبل ما توصل هون. فبهاي النقطة
    الجلسة موثوقة ومتحقق منها فعليًا — getSession() بيقرأ من الـ cookie
    مباشرة بدون رحلة شبكة إضافية.
  */
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect('/login');

  const today = new Date();
  const calendarRangeStart = new Date(today.getFullYear(), today.getMonth() - 2, today.getDate());
  const calendarRangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, today.getDate());

  // ═══════════════════════════════════════════════════════════════════
  // BATCH 1: كل الاستعلامات المستقلة عن بعضها تنطلق بنفس اللحظة.
  //
  // ⚠️ leaderboard / daily verse / studio pulse stats: نفس المحتوى لكل
  // مستخدم بنفس اللحظة (مش شخصية)، فبتجي من getCachedLeaderboard/
  // getCachedDailyVerse/getCachedStudioPulseStats (unstable_cache،
  // src/lib/supabase/cachedQueries.ts) بدل RPC مباشر — أول طلب بيحمّل
  // من الداتابيز، وأي طلب تاني بنفس دقيقة تقريبًا بياخد الرد الجاهز
  // فورًا. باقي الاستعلامات هون (team progress, deadlines, platforms,
  // roster) شخصية أو بتتغيّر بشكل يحتاج دايمًا آخر نسخة، فضلّت مباشرة.
  // ═══════════════════════════════════════════════════════════════════
  const [
    { data: teamProgressRows },
    { data: deadlineRows },
    weeklyRows,
    monthlyRows,
    verseRows,
    pulseStatsRows,
    { data: viewerProfile },
    { data: platformRows },
    { data: rosterRows },
  ] = await Promise.all([
    supabase.rpc('get_team_progress'),
    supabase.rpc('get_my_deadlines'),
    getCachedLeaderboard('weekly'),
    getCachedLeaderboard('monthly'),
    getCachedDailyVerse(),
    getCachedStudioPulseStats(),
    supabase
      .from('profiles')
      .select('is_chief, is_developer, access_role')
      .eq('id', user.id)
      .single(),
    supabase
      .from('platforms')
      .select(`
        id, name_en, name_ar, color, thumbnail_url,
        platform_team_categories (
          id, label_en, label_ar, sort_order,
          platform_team_members (
            id,
            member:profiles!platform_team_members_member_id_fkey (
              id, first_name, last_name, color, avatar_url, job_title_en, job_title_ar
            )
          )
        )
      `)
      .order('name_en')
      .order('sort_order', { referencedTable: 'platform_team_categories' }),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, color, avatar_url')
      .eq('status', 'active')
      .is('deleted_at', null),
  ]);

  const teamMembers: TeamMemberData[] = (teamProgressRows ?? []).map((row: TeamProgressRow) => ({
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

  const deadlines: DeadlineData[] = (deadlineRows ?? []).map((row: DeadlineRow) => ({
    id: row.id,
    title: row.title,
    color: getPriorityColor(row.priority),
    deadlineAt: new Date(row.deadline_at).getTime(),
    windowMs: row.window_seconds * 1000,
  }));

  const mapLeaderboardRow = (row: LeaderboardRow): LeaderEntry => ({
    rank: row.rank as 1 | 2 | 3,
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

  const calendarMembers: CalendarMemberData[] = sortMembersForDisplay(
    teamMembers.map((m) => ({ id: m.id, name: m.name, color: m.color, avatarUrl: m.avatarUrl, initials: m.initials })),
    user.id,
    5,
  );

  const verseRow: DailyVerseRow | undefined = verseRows?.[0];
  const verse: DailyVerseData = {
    surahNameAr: verseRow?.surah_name_ar ?? '',
    surahNameEn: verseRow?.surah_name_en ?? '',
    ayahNumber: verseRow?.ayah_number ?? 0,
    arabicText: verseRow?.arabic_text ?? '',
  };

  const statsRow: StudioPulseStatsRow | undefined = pulseStatsRows?.[0];
  const studioPulseStats: StudioPulseStatsData = {
    tasksCompletedThisMonth: statsRow?.tasks_completed_this_month ?? 0,
    completionRateMonthPct: statsRow?.completion_rate_month_pct ?? 0,
    completionRateOverallPct: statsRow?.completion_rate_overall_pct ?? 0,
    mostActiveMember: statsRow?.most_active_member_id
      ? {
          id: statsRow.most_active_member_id,
          name: statsRow.most_active_member_name?.trim() || '—',
          initials: statsRow.most_active_member_initials || '—',
          color: statsRow.most_active_member_color || '#0d9488',
          avatarUrl: statsRow.most_active_member_avatar_url,
          tasksCompleted: statsRow.most_active_member_tasks_completed ?? 0,
        }
      : null,
  };

  const memberBio = (jobTitle: string | null) => jobTitle ?? '';
  const platforms: PlatformData[] = (platformRows ?? []).map((row: PlatformRow) => ({
    id: row.id,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    color: row.color || '#458482',
    thumbnail: row.thumbnail_url,
    categories: (row.platform_team_categories ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((cat) => ({
        id: cat.id,
        labelEn: cat.label_en,
        labelAr: cat.label_ar,
        members: (cat.platform_team_members ?? [])
          .filter((pm) => pm.member !== null)
          .map((pm) => {
            const m = pm.member!;
            const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || '—';
            const initials = `${m.first_name?.[0] ?? ''}${m.last_name?.[0] ?? ''}`.toUpperCase() || '—';
            return {
              id: m.id,
              name,
              initials,
              color: m.color || '#0d9488',
              avatarUrl: m.avatar_url,
              bio: memberBio(m.job_title_en),
              bioAr: memberBio(m.job_title_ar),
            };
          }),
      })),
  }));

  const roster: RosterMemberData[] = (rosterRows ?? []).map((row: RosterRow) => ({
    id: row.id,
    name: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() || '—',
    initials: `${row.first_name?.[0] ?? ''}${row.last_name?.[0] ?? ''}`.toUpperCase() || '—',
    color: row.color || '#0d9488',
    avatarUrl: row.avatar_url,
  }));

  // ═══════════════════════════════════════════════════════════════════
  // BATCH 2: يعتمد على نتيجة BATCH 1، بس مستقل داخليًا → بنطلق مع بعض.
  // ═══════════════════════════════════════════════════════════════════
  const [{ data: calendarTaskRows }, canManagePlatforms] = await Promise.all([
    supabase.rpc('get_calendar_tasks', {
      p_member_ids: calendarMembers.map((m) => m.id),
      p_start: toISODate(calendarRangeStart),
      p_end: toISODate(calendarRangeEnd),
    }),
    viewerProfile
      ? hasCapability(
          supabase,
          {
            id: user.id,
            isDeveloper: viewerProfile.is_developer,
            isChief: viewerProfile.is_chief,
            accessRole: viewerProfile.access_role,
          },
          'platforms.manage'
        )
      : Promise.resolve(false),
  ]);

  const calendarTasks: CalendarTaskData[] = (calendarTaskRows ?? []).map((row: CalendarTaskRow) => ({
    id: row.id,
    memberId: row.member_id,
    title: row.title,
    start: row.start_date,
    end: row.end_date,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <TeamProgress members={teamMembers} currentUserId={user.id} />
      </section>

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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1 flex flex-col">
          <MembersCard platforms={platforms} roster={roster} isAdmin={canManagePlatforms} />
        </div>
        <div className="lg:col-span-2 flex flex-col h-full">
          <StudioPulse verse={verse} stats={studioPulseStats} />
        </div>
      </section>

      <section>
        <Leaderboard weeklyEntries={weeklyEntries} monthlyEntries={monthlyEntries} />
      </section>
    </div>
  );
}
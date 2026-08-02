// src\app\(dashboard)\layout.tsx
// Server Component: بيجيب بيانات المستخدم والصلاحيات قبل ما تُعرض الصفحة،
// عشان الواجهة تبدأ ببيانات جاهزة بدل ومضة "—" لحظة التحميل.

import { createClient } from '@/lib/supabase/server';
import type { CurrentUser } from '@/context/UserContext';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();

  let initialUser: CurrentUser | null = null;
  let initialPermissions: string[] = [];

  if (authUser) {
    const [{ data: profile }, { data: perms }] = await Promise.all([
      supabase
        .from('profiles')
        .select('first_name, last_name, access_role, is_chief, is_developer, job_title_en, job_title_ar, color, avatar_url')
        .eq('id', authUser.id)
        .single(),
      supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', authUser.id),
    ]);

    if (profile) {
      const firstName = profile.first_name ?? '';
      const lastName = profile.last_name ?? '';
      initialUser = {
        id: authUser.id,
        email: authUser.email ?? '',
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
        accessRole: profile.access_role,
        isChief: profile.is_chief,
        isDeveloper: profile.is_developer ?? false,
        jobTitleEn: profile.job_title_en,
        jobTitleAr: profile.job_title_ar,
        color: profile.color ?? '#0d9488',
        avatarUrl: profile.avatar_url,
      };
    }

    initialPermissions = (perms ?? []).map((p) => p.permission_key);
  }

  return (
    <DashboardShell initialUser={initialUser} initialPermissions={initialPermissions}>
      {children}
    </DashboardShell>
  );
}
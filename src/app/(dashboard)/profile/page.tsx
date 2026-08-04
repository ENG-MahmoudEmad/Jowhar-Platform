// src/app/(dashboard)/profile/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canEditRoles } from '@/lib/permissions/hierarchy';
import ProfileClient from './ProfileClient';
import { getPasswordChangeInfo } from './actions';
import type { PendingEmail } from '@/components/dashboard/profile/PersonalInfo';

const FALLBACK_COLOR = '#0d9488';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, color, avatar_url, job_title_en, job_title_ar, access_role, is_chief, is_developer, lock_name, lock_avatar, created_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const { data: request } = await supabase
    .from('email_change_requests')
    .select('new_email, status')
    .eq('user_id', user.id)
    .in('status', ['pending_admin', 'pending_email_verification'])
    .maybeSingle();

  const pendingEmail: PendingEmail | null = request
? { newEmail: request.new_email, stage: request.status as 'pending_admin' | 'pending_email_verification' }
    : null;

  /*
    `last_sign_in_at` موجود بـ auth.users فقط — service_role إلزامي.
    ما بننسخه لـ profiles عشان ما يصير عمود بايت لازم يتحدث بكل دخول.
  */
  let lastLoginAt: string | null = null;
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.auth.admin.getUserById(user.id);
    lastLoginAt = data?.user?.last_sign_in_at ?? null;
  } catch {
    // فشلها ما بيمنع عرض الصفحة
  }

  const cooldown = await getPasswordChangeInfo();

  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || '—';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <ProfileClient
        userId={user.id}
        initialName={name}
        email={user.email ?? '—'}
        jobTitle={profile.job_title_en ?? undefined}
        jobTitleAr={profile.job_title_ar ?? undefined}
        initialAvatarUrl={profile.avatar_url}
        joinedDate={profile.created_at}
        memberColor={profile.color || FALLBACK_COLOR}
        isAdmin={profile.is_chief || profile.is_developer || profile.access_role === 'admin'}
        // الـ Chief والـ Developer يعدّلوا لونهم ومسمّاهم من صفحتهم (مايجريشن 014)
        canEditIdentity={canEditRoles({
          id: user.id,
          isDeveloper: profile.is_developer,
          isChief: profile.is_chief,
          accessRole: profile.access_role,
        })}
        initialJobTitleEn={profile.job_title_en ?? ''}
        initialJobTitleAr={profile.job_title_ar ?? ''}
        restrictions={{ nameLocked: profile.lock_name, avatarLocked: profile.lock_avatar }}
        // الأقفال مفروضة بـ trigger كمان — الإخفاء هون للوضوح مش للحماية
        canEditName={!profile.lock_name}
        canEditAvatar={!profile.lock_avatar}
        pendingEmail={pendingEmail}
        lastLoginAt={lastLoginAt}
        cooldown={cooldown}
      />
    </div>
  );
}
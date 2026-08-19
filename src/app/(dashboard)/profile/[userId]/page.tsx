// src/app/(dashboard)/profile/[userId]/page.tsx
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canAccessAdminControl, canEditRoles, canManage } from '@/lib/permissions/hierarchy';
import MemberProfileClient from './MemberProfileClient';
import type { PendingEmailChange } from '@/components/dashboard/profile/AdminControls';

const FALLBACK_COLOR = '#0d9488';

export default async function MemberProfilePage({
  params,
}: {
  // ⚠️ Next.js 16: params صارت Promise
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // فتح رابط بروفايلك من هون = نفس صفحتك، وهناك بتقدر تعدّل فعليًا
  if (userId === user.id) redirect('/profile');

  const { data: viewer } = await supabase
    .from('profiles')
    .select('id, is_chief, is_developer, access_role')
    .eq('id', user.id)
    .single();

  if (!viewer) redirect('/login');

  const actor = {
    id: viewer.id,
    isDeveloper: viewer.is_developer,
    isChief: viewer.is_chief,
    accessRole: viewer.access_role,
  };

  // بروفايلات الآخرين مرئية لمين بيوصل Admin Control فقط
  if (!canAccessAdminControl(actor)) redirect('/profile');

  const { data: member } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, color, avatar_url, job_title_en, job_title_ar, access_role, is_chief, is_developer, lock_name, lock_avatar, created_at, deleted_at')
    .eq('id', userId)
    .single();

  if (!member || member.deleted_at) notFound();

  const target = {
    id: member.id,
    isDeveloper: member.is_developer,
    isChief: member.is_chief,
    accessRole: member.access_role,
  };

  // ما بتقدر تدير هذا العضو؟ ما إلك شغل ببروفايله
  if (!canManage(actor, target)) redirect('/adminControl');

  /*
    اللون والمسمّى الوظيفي حصريان للـ Chief والـ Developer — مطابق
    لـ `requireIdentityEditor` بالأكشنز. الإخفاء هون للوضوح، والفرض
    بالسيرفر.
  */
  const canEditIdentity = canEditRoles(actor);

  const { data: request } = await supabase
    .from('email_change_requests')
    .select('new_email, status, requested_at')
    .eq('user_id', userId)
    .in('status', ['pending_admin', 'pending_email_verification'])
    .maybeSingle();

  /*
    الفلتر فوق (.in) بيضمن وقت التشغيل إنه status هيكون وحدة من اثنتين بس،
    بس TypeScript ما بيقدر يضيّق نوع العمود بناءً على .in() — عمود status
    بالداتابيز عنده 3 حالات ممكنة ('completed' هي الثالثة)، فبيفترض أي
    وحدة فيهم ممكنة. التأكيد اليدوي هون آمن 100% لأنه الاستعلام نفسه
    بيستبعد 'completed' فعليًا.
  */
  const pendingEmail: PendingEmailChange | null = request
    ? {
        newEmail: request.new_email,
        requestedAt: request.requested_at,
        stage: request.status as 'pending_admin' | 'pending_email_verification',
      }
    : null;

  // الإيميل بـ auth.users فقط
  let email = '—';
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.auth.admin.getUserById(userId);
    email = data?.user?.email ?? '—';
  } catch {
    // فشلها ما بيمنع عرض الصفحة
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <MemberProfileClient
        memberId={member.id}
        firstName={member.first_name ?? ''}
        lastName={member.last_name ?? ''}
        email={email}
        jobTitleEn={member.job_title_en ?? ''}
        jobTitleAr={member.job_title_ar ?? ''}
        avatarUrl={member.avatar_url}
        joinedDate={member.created_at}
        initialColor={member.color || FALLBACK_COLOR}
        isAdmin={member.is_chief || member.is_developer || member.access_role === 'admin'}
        isChief={member.is_chief}
        initialRestrictions={{
          nameLocked: member.lock_name,
          avatarLocked: member.lock_avatar,
        }}
        pendingEmail={pendingEmail}
        canEditIdentity={canEditIdentity}
      />
    </div>
  );
}
// src/app/(dashboard)/adminControl/page.tsx
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminControlClient from './AdminControlClient';

// نفس منطق تحويل initials المستخدم بأماكن تانية بالمشروع (Sidebar، إلخ)
function initialsOf(firstName: string | null, lastName: string | null) {
  const a = firstName?.trim()?.[0] ?? '';
  const b = lastName?.trim()?.[0] ?? '';
  return (a + b).toUpperCase() || '—';
}

export default async function AdminControlPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('is_chief, is_developer')
    .eq('id', currentUser?.id ?? '')
    .maybeSingle();

  const isChiefOrDev = Boolean(currentProfile?.is_chief || currentProfile?.is_developer);

  // ---- Pending Approvals ----
  const { data: pendingProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, created_at')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true });

  /*
    ⚠️ فلترة إلزامية: حساب ما أكّد إيميله لسا ما لازم يظهر هون إطلاقًا،
    وإلا الأدمن بيقدر يوافق على حساب صاحبه لسا ما أثبت إنه يملك هالإيميل.

    نفس المنطق بالضبط اللي بيحكم متى يوصل الإشعار (مايجريشن 020) —
    لازم القائمة والإشعار يتفقوا، وإلا الأدمن بيشوف طلب بلا إشعار أو
    العكس. الإيميل وحالة التأكيد الاتنين بـ auth.users، فبنجيبهم مع
    بعض بنفس الاستدعاء بدل استعلامين منفصلين.
  */
  const pendingWithEmail = await Promise.all(
    (pendingProfiles ?? []).map(async (p) => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        email: authUser?.user?.email ?? '—',
        requestedAt: p.created_at,
        isEmailConfirmed: Boolean(authUser?.user?.email_confirmed_at),
      };
    })
  );

  const pending = pendingWithEmail
    .filter((p) => p.isEmailConfirmed)
    .map(({ id, name, email, requestedAt }) => ({ id, name, email, requestedAt }));

  // ---- Members List (كل الأعضاء active بمن فيهم الأدمن) ----
  const { data: memberProfiles } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, access_role, is_chief, is_developer, is_suspended, suspended_until, color, avatar_url, job_title_en, job_title_ar, created_at'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  /*
    الأدمن الثانوي (مش شيف أدمن ولا ديفيلوبر) بس يشوف زملاءه اللي يشاركهم
    منصة وحدة عالأقل — نفس قيد "المنصة المشتركة" المطبّق على تكليف
    التاسكات وكتابة الملاحظات. الشيف أدمن/الديفيلوبر بيشوفوا الكل.

    استثناء: صفوف الشيف أدمن/الديفيلوبر/نفس الشخص تضل ظاهرة دايمًا (مقفولة
    بصريًا بـ canOpen بالواجهة أصلاً) عشان الأدمن الثانوي يعرف هرم الفريق
    حتى لو ما يقدر يفتحهم.
  */
  let visibleMemberIds: Set<string> | null = null;
  if (!isChiefOrDev && currentUser) {
    const { data: myPlatforms } = await supabase
      .from('platform_team_members')
      .select('platform_id')
      .eq('member_id', currentUser.id);

    const platformIds = (myPlatforms ?? []).map((p) => p.platform_id);

    if (platformIds.length > 0) {
      const { data: teammates } = await supabase
        .from('platform_team_members')
        .select('member_id')
        .in('platform_id', platformIds);
      visibleMemberIds = new Set((teammates ?? []).map((t) => t.member_id));
    } else {
      visibleMemberIds = new Set();
    }
  }

  const filteredProfiles = (memberProfiles ?? []).filter((m) => {
    if (!visibleMemberIds) return true; // شيف أدمن/ديفيلوبر: بلا فلترة
    if (m.is_chief || m.is_developer || m.id === currentUser?.id) return true;
    return visibleMemberIds.has(m.id);
  });

  const members = filteredProfiles.map((m) => ({
    id: m.id,
    name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(),
    initials: initialsOf(m.first_name, m.last_name),
    avatarUrl: m.avatar_url ?? null,
    role: m.access_role as 'admin' | 'member',
    roleLabel: m.job_title_en || (m.access_role === 'admin' ? 'Admin' : 'Member'),
    roleLabelAr: m.job_title_ar || (m.access_role === 'admin' ? 'أدمن' : 'عضو'),
    color: m.color || '#0d9488',
    isChief: m.is_chief,
    isDeveloper: m.is_developer ?? false,
    isSuspended: m.is_suspended,
    suspendedUntil: m.suspended_until ?? undefined,
    createdAt: m.created_at,
  }));

  // ---- بادجات الإشعارات لكل عضو (تاسكات قيد المراجعة + ردود ملاحظات جديدة) ----
  const { data: badgeRows } = await supabase.rpc('get_admin_member_badges');
  const badgesByMember: Record<string, number> = {};
  for (const row of badgeRows ?? []) {
    badgesByMember[row.member_id] = row.badge_count;
  }

  // ---- Permissions Registry (مصدر واحد للحقيقة من الداتابيز) ----
  // أي صلاحية جديدة تنضاف للجدول بتظهر بالواجهة تلقائيًا بدون تعديل كود.
  const { data: permissionRows } = await supabase
    .from('permissions')
    .select('key, label_en, label_ar, category')
    .order('category', { ascending: true })
    .order('key', { ascending: true });

  const registry = (permissionRows ?? []).map((p) => ({
    key: p.key,
    labelEn: p.label_en,
    labelAr: p.label_ar,
    category: p.category,
  }));

  // ---- الصلاحيات الممنوحة لكل عضو (خريطة memberId → مفاتيح) ----
  const { data: grantedRows } = await supabase
    .from('user_permissions')
    .select('user_id, permission_key');

  const grantedByMember: Record<string, string[]> = {};
  for (const row of grantedRows ?? []) {
    grantedByMember[row.user_id] = [...(grantedByMember[row.user_id] ?? []), row.permission_key];
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <AdminControlClient
        initialPending={pending}
        initialMembers={members}
        registry={registry}
        grantedByMember={grantedByMember}
        initialBadgesByMember={badgesByMember}
      />
    </div>
  );
}
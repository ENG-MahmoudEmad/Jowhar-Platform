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

  // ---- Pending Approvals ----
  const { data: pendingProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, created_at')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: true });

  // الإيميل مش موجود بجدول profiles — لازم auth.users عبر service role
  const pending = await Promise.all(
    (pendingProfiles ?? []).map(async (p) => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        email: authUser?.user?.email ?? '—',
        requestedAt: p.created_at,
      };
    })
  );

  // ---- Members List (كل الأعضاء active بمن فيهم الأدمن) ----
  const { data: memberProfiles } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, access_role, is_chief, is_suspended, suspended_until, color, job_title_en, job_title_ar'
    )
    .eq('status', 'active')
    .order('is_chief', { ascending: false })
    .order('first_name', { ascending: true });

  const members = (memberProfiles ?? []).map((m) => ({
    id: m.id,
    name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(),
    initials: initialsOf(m.first_name, m.last_name),
    role: m.access_role as 'admin' | 'member',
    roleLabel: m.job_title_en || (m.access_role === 'admin' ? 'Admin' : 'Member'),
    roleLabelAr: m.job_title_ar || (m.access_role === 'admin' ? 'أدمن' : 'عضو'),
    color: m.color || '#0d9488',
    isChief: m.is_chief,
    isSuspended: m.is_suspended,
    suspendedUntil: m.suspended_until ?? undefined,
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <AdminControlClient initialPending={pending} initialMembers={members} />
    </div>
  );
}
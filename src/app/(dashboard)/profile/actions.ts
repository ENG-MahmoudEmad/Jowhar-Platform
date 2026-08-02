//src/app/(dashboard)/profile/actions.ts
// إجراءات العضو على بروفايله هو.
// كل شي هون بيمس صف المستخدم الحالي فقط — لا يوجد أي `memberId` كوسيط،
// عشان ما يصير استدعاء بيعدّل على حدا تاني بالغلط.
'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSbClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** المواصفات: تغيير طوعي لكلمة السر مرة كل 7 أيام. */
const PASSWORD_CHANGE_COOLDOWN_DAYS = 7;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('unauthenticated');
  return { supabase, user };
}

// ===========================================================
// الاسم
// ===========================================================
export async function updateMyName(firstName: string, lastName: string) {
  const { supabase, user } = await requireUser();

  const first = firstName.trim();
  const last = lastName.trim();

  // المواصفات: مقطعين، ما ينفع فاضي ولا مقطع واحد
  if (!first || !last) throw new Error('name_needs_two_parts');
  if (first.length > 40 || last.length > 40) throw new Error('name_too_long');

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: first, last_name: last })
    .eq('id', user.id);

  /*
    `name_locked` بيجي من trigger `trg_guard_profile_self_update` —
    الواجهة بتخفي زر التعديل، بس الرسالة لازم تكون واضحة لو حدا تخطاها.
  */
  if (error) {
    throw new Error(error.message.includes('name_locked') ? 'name_locked' : 'name_update_failed');
  }

  revalidatePath('/profile');
}

// ===========================================================
// الصورة الشخصية
// ===========================================================
/**
 * الرفع نفسه بيصير من المتصفح مباشرة لـ Storage (أسرع وما بيمر بالسيرفر).
 * هالأكشن بس بيثبّت الرابط بعد نجاح الرفع.
 */
export async function updateMyAvatar(avatarUrl: string | null) {
  const { supabase, user } = await requireUser();

  if (avatarUrl && !avatarUrl.startsWith('https://')) {
    throw new Error('invalid_url');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message.includes('avatar_locked') ? 'avatar_locked' : 'avatar_update_failed');
  }

  revalidatePath('/profile');
}

// ===========================================================
// طلب تغيير الإيميل
// ===========================================================
export async function requestEmailChange(newEmail: string) {
  const { supabase, user } = await requireUser();

  const email = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_email');
  if (email === user.email?.toLowerCase()) throw new Error('same_email');

  /*
    فحص التفرّد قبل ما الطلب يوصل للأدمن أصلاً — ما في داعي يراجع طلب
    محكوم عليه بالفشل. الإيميلات بـ auth.users فبنحتاج service_role.
  */
  const adminClient = createAdminClient();
  const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const taken = usersPage?.users?.some((u) => u.email?.toLowerCase() === email);
  if (taken) throw new Error('email_taken');

  // ولا يكون محجوز بطلب معلّق لعضو تاني
  const { data: reserved } = await supabase
    .from('email_change_requests')
    .select('id')
    .eq('new_email', email)
    .eq('status', 'pending_admin')
    .neq('user_id', user.id)
    .maybeSingle();

  if (reserved) throw new Error('email_taken');

  // المواصفات: طلب جديد بيستبدل القديم — ما في تراكم
  await supabase
    .from('email_change_requests')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'pending_admin');

  const { error } = await supabase.from('email_change_requests').insert({
    user_id: user.id,
    new_email: email,
    status: 'pending_admin',
  });

  if (error) throw new Error('request_failed');

  revalidatePath('/profile');
}

export async function cancelMyEmailRequest() {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('email_change_requests')
    .delete()
    .eq('user_id', user.id)
    .eq('status', 'pending_admin');

  if (error) throw new Error('cancel_failed');

  revalidatePath('/profile');
}

// ===========================================================
// تغيير كلمة السر (طوعي — مرة كل 7 أيام)
// ===========================================================
export type PasswordChangeInfo = {
  lastChangedAt: string | null;
  nextAllowedAt: string | null;
  canChange: boolean;
};

export async function getPasswordChangeInfo(): Promise<PasswordChangeInfo> {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from('profiles')
    .select('last_password_change_at')
    .eq('id', user.id)
    .single();

  const last = data?.last_password_change_at ?? null;
  if (!last) return { lastChangedAt: null, nextAllowedAt: null, canChange: true };

  const next = new Date(last);
  next.setDate(next.getDate() + PASSWORD_CHANGE_COOLDOWN_DAYS);

  return {
    lastChangedAt: last,
    nextAllowedAt: next.toISOString(),
    canChange: next.getTime() <= Date.now(),
  };
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const { supabase, user } = await requireUser();

  if (newPassword.length < 8) throw new Error('password_too_short');
  if (currentPassword === newPassword) throw new Error('password_unchanged');

  /*
    ⚠️ القيد الأسبوعي هون فقط. `request_password_reset` (مايجريشن 004)
    إلها rate limit مستقل بـ 10 دقايق، وهو سيناريو طارئ — ممنوع نخلط
    الاتنين، وإلا حدا نسي كلمته وما بيقدر يستعيدها لأسبوع.
  */
  const info = await getPasswordChangeInfo();
  if (!info.canChange) throw new Error('password_cooldown');

  /*
    التحقق من كلمة السر الحالية بعميل منفصل تمامًا — لو استعملنا العميل
    المربوط بالكوكيز، تسجيل الدخول بيستبدل الجلسة الحالية.
  */
  const verifier = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (verifyError) throw new Error('wrong_current_password');

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error('password_update_failed');

  // ختم التاريخ عبر دالة مايجريشن 004
  await supabase.rpc('stamp_password_change');

  /*
    إبطال باقي الجلسات — لو كان في حدا داخل بكلمة السر القديمة، بينطرد.
    فشلها ما بيلغي نجاح التغيير، فبتنبلع.
  */
  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.signOut(user.id, 'others');
  } catch {
    // TODO: إيميل تنبيه أمني بعد تغيير كلمة السر (بند مؤجل #5)
  }

  revalidatePath('/profile');
}
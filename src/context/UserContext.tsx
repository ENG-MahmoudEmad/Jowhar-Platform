//src\context\UserContext.tsx

"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { canAccessAdminControl as checkAdminAccess } from '@/lib/permissions/hierarchy';

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  /** أول حرف من كل مقطع — يُستخدم كـ fallback لما ما يكون في صورة */
  initials: string;
  accessRole: 'member' | 'admin';
  isChief: boolean;
  /** أعلى مستوى وصول — يُضبط يدويًا بـ SQL فقط، مش من أي واجهة */
  isDeveloper: boolean;
  jobTitleEn: string | null;
  jobTitleAr: string | null;
  color: string;
  avatarUrl: string | null;
};

type UserContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  /** صلاحيات العضو الممنوحة (مفاتيح من Permissions Registry) */
  permissions: string[];
  hasPermission: (key: string) => boolean;
  /** الوصول لصفحة Admin Control: Developer أو Chief أو أي أدمن */
  canAccessAdminControl: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  /**
   * "مين فاتح الموقع دلوقتي" — عبر Supabase Realtime Presence، مش جدول
   * بالداتابيز. القناة واحدة مشتركة لكل الداشبورد (mount مرة واحدة هون)،
   * وأي كومبوننت بيقدر يسأل isOnline(memberId) بدل ما يعمل اشتراك خاص فيه.
   */
  isOnline: (userId: string) => boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

const PRESENCE_CHANNEL_NAME = 'online-users';

export function UserProvider({
  children,
  initialUser = null,
  initialPermissions = [],
}: {
  children: React.ReactNode;
  /**
   * بيانات المستخدم مجلوبة من السيرفر (dashboard layout).
   * وجودها بيلغي ومضة الـ "—" اللي كانت تظهر لجزء من الثانية بعد كل
   * login/logout، لأن الواجهة بتبدأ ببيانات جاهزة بدل ما تنتظر
   * استعلام client-side يخلص.
   */
  initialUser?: CurrentUser | null;
  initialPermissions?: string[];
}) {
  const [user, setUser] = useState<CurrentUser | null>(initialUser);
  const [permissions, setPermissions] = useState<string[]>(initialPermissions);
  // ما في تحميل ابتدائي طالما البيانات وصلت جاهزة من السيرفر
  const [loading, setLoading] = useState(initialUser === null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

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
      setUser({
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
      });
    }

    setPermissions((perms ?? []).map((p) => p.permission_key));
    setLoading(false);
  }, []);

  // الجلب الابتدائي client-side صار مطلوب فقط لو ما وصلت بيانات من السيرفر
  useEffect(() => {
    if (initialUser === null) load();
  }, [initialUser, load]);

  // مزامنة لما السيرفر يعيد الجلب (بعد router.refresh أو تنقّل)
  useEffect(() => {
    if (initialUser !== null) {
      setUser(initialUser);
      setLoading(false);
    }
  }, [initialUser]);

  useEffect(() => {
    setPermissions(initialPermissions);
  }, [initialPermissions]);

  /*
    ── Presence: "مين أونلاين دلوقتي" ──
    قناة واحدة مشتركة لكل الداشبورد. كل تبويب/جهاز فاتح الموقع بيـ"يسجل
    حضوره" (`track`) بمجرد الاتصال، والـ`sync` event بيرجع قائمة كل الـ
    presence keys المتصلة حاليًا (احنا مستخدمين user.id كـkey). لما تبويب
    يتقفل أو الاتصال ينقطع، Supabase بيشيله تلقائيًا من الحالة خلال ثواني
    (`leave` event)، فمفيش داعي نتعامل معه يدويًا — الـ`sync` بيرجع الصورة
    الكاملة الصحيحة كل مرة.

    ⚠️ ما بنستخدم createAdminClient هون — العميل العادي (anon) كافي تمامًا
    لأن presence مش بيلمس أي جدول أو RLS، هو حالة WebSocket لحظية بس.
  */
  useEffect(() => {
    if (!user) {
      setOnlineUserIds(new Set());
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(PRESENCE_CHANNEL_NAME, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUserIds(new Set(Object.keys(state)));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isOnline = useCallback(
    (userId: string) => onlineUserIds.has(userId),
    [onlineUserIds],
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    /*
      ملاحظة: ما منعمل setUser(null) هون عن قصد.
      تصفير الحالة قبل ما يخلص التنقل كان يخلي الـ Sidebar يعيد الرسم فورًا
      بـ user = null، فيظهر الـ fallback "—" لجزء من الثانية قبل ما تروح الصفحة.
      الـ dashboard layout بينفك من الشجرة كامل عند الوصول لـ /login،
      فالحالة بتنمسح تلقائيًا بدون ومضة.
    */
    router.push('/login');
    router.refresh(); // يضمن إنه الـ proxy يعيد التقييم بجلسة فاضية
  }, [router]);

  const hasPermission = useCallback(
    (key: string) => {
      if (!user) return false;
      // الـ Developer والـ Chief عندهم كل شي
      if (user.isDeveloper || user.isChief) return true;
      return permissions.includes(key);
    },
    [user, permissions],
  );

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      permissions,
      hasPermission,
      canAccessAdminControl: user ? checkAdminAccess(user) : false,
      signOut,
      refresh: load,
      isOnline,
    }),
    [user, loading, permissions, hasPermission, signOut, load, isOnline],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used inside <UserProvider>');
  }
  return ctx;
}
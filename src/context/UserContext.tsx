"use client";

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  /** الوصول لصفحة Admin Control: أي أدمن (أو الـ Chief) */
  canAccessAdminControl: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
        .select('first_name, last_name, access_role, is_chief, job_title_en, job_title_ar, color, avatar_url')
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
        jobTitleEn: profile.job_title_en,
        jobTitleAr: profile.job_title_ar,
        color: profile.color ?? '#0d9488',
        avatarUrl: profile.avatar_url,
      });
    }

    setPermissions((perms ?? []).map((p) => p.permission_key));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setPermissions([]);
    router.push('/login');
    router.refresh(); // يضمن إنه الـ proxy يعيد التقييم بجلسة فاضية
  }, [router]);

  const hasPermission = useCallback(
    (key: string) => {
      if (!user) return false;
      if (user.isChief) return true; // الـ Chief عنده كل شي
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
      canAccessAdminControl: user?.accessRole === 'admin' || user?.isChief === true,
      signOut,
      refresh: load,
    }),
    [user, loading, permissions, hasPermission, signOut, load],
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
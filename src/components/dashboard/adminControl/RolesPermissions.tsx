// src/components/dashboard/adminControl/RolesPermissions.tsx
"use client";

import React, { memo, useMemo, useState, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Check } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { setMemberRole, togglePermission } from '@/app/(dashboard)/adminControl/rolesActions';

type Lang = 'en' | 'ar';
type RoleValue = 'member' | 'admin';

/**
 * تعريف الصلاحية — يجي من جدول `permissions` بقاعدة البيانات، مش من قائمة
 * مكتوبة بالكود. أي صلاحية جديدة تُضاف للجدول بتظهر هون تلقائيًا.
 */
export type PermissionDef = {
  key: string;
  labelEn: string;
  labelAr: string;
  category: string;
};

type RolesStyle = React.CSSProperties & Record<`--rp-${string}`, string>;

const CARD_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const ROW_TRANSITION = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const TEXT = {
  en: {
    title: 'Roles & Permissions',
    subtitle: 'Grant admin-level access to this member',
    roleMember: 'Member',
    roleAdmin: 'Admin',
    permissionsTitle: 'Granted permissions',
    permissionsHint: 'Pick exactly what this admin can do',
    chiefLocked: "This is the Chief Admin — their role and access can't be changed.",
    errorRole: 'Could not update the role — the change was reverted.',
    errorPermission: 'Could not update the permission — the change was reverted.',
  },
  ar: {
    title: 'الأدوار والصلاحيات',
    subtitle: 'منح صلاحيات أدمن لهذا العضو',
    roleMember: 'عضو',
    roleAdmin: 'أدمن',
    permissionsTitle: 'الصلاحيات الممنوحة',
    permissionsHint: 'اختر بالضبط شو هالأدمن يقدر يعمل',
    chiefLocked: 'هاد الأدمن الرئيسي — دوره وصلاحياته ما بتتغير.',
    errorRole: 'تعذّر تغيير الدور — تم التراجع عن التغيير.',
    errorPermission: 'تعذّر تحديث الصلاحية — تم التراجع عن التغيير.',
  },
} satisfies Record<Lang, {
  title: string; subtitle: string; roleMember: string; roleAdmin: string;
  permissionsTitle: string; permissionsHint: string; chiefLocked: string;
  errorRole: string; errorPermission: string;
}>;

/**
 * تسميات الفئات — المفاتيح لازم تطابق عمود `category` بجدول permissions.
 * أي فئة جديدة بدون تسمية هون بتظهر بمفتاحها الخام كـ fallback.
 */
const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  admin_control: { en: 'Admin Control', ar: 'الأدمن كونترول' },
  archive: { en: 'Archive', ar: 'الأرشيف' },
  members: { en: 'Members', ar: 'الأعضاء' },
  news: { en: 'News Feed', ar: 'الأخبار' },
};

function getPalette(isDark: boolean): RolesStyle {
  return {
    '--rp-bg': isDark ? 'var(--card)' : '#ffffff',
    '--rp-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--rp-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--rp-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--rp-input-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    '--rp-text-main': 'var(--foreground)',
    '--rp-text-muted': 'var(--foreground-muted)',
    background: 'var(--rp-bg)',
    border: '1px solid var(--rp-border)',
  };
}

// =========================================================
// Segmented role toggle
// =========================================================
const RoleToggle = memo(function RoleToggle({
  value,
  onChange,
  lang,
}: {
  value: RoleValue;
  onChange: (v: RoleValue) => void;
  lang: Lang;
}) {
  const copy = TEXT[lang];
  const options: { value: RoleValue; label: string }[] = [
    { value: 'member', label: copy.roleMember },
    { value: 'admin', label: copy.roleAdmin },
  ];

  return (
    <div className="relative inline-flex rounded-lg border border-[var(--rp-border)] bg-[var(--rp-input-bg)] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="relative z-10 cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors"
            style={{
              color: active ? '#ffffff' : 'var(--rp-text-muted)',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {active && (
              <m.span
                layoutId="role-toggle-active"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 -z-10 rounded-md bg-[#458482]"
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
});

// =========================================================
// Permission checkbox row
// =========================================================
const PermissionRow = memo(function PermissionRow({
  permission,
  checked,
  isLast,
  lang,
  onToggle,
}: {
  permission: PermissionDef;
  checked: boolean;
  isLast: boolean;
  lang: Lang;
  onToggle: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(permission.key)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors hover:bg-[var(--rp-input-bg)] sm:px-5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--rp-divider)' }}
    >
      <span
        className="text-sm font-medium text-[var(--rp-text-main)]"
        style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
      >
        {lang === 'ar' ? permission.labelAr : permission.labelEn}
      </span>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors"
        style={{
          borderColor: checked ? '#458482' : 'var(--rp-border)',
          background: checked ? '#458482' : 'transparent',
        }}
      >
        {checked && <Check size={12} className="text-white" aria-hidden="true" />}
      </span>
    </button>
  );
});

// =========================================================
// Main Component
// =========================================================
function RolesPermissions({
  memberId,
  isChief = false,
  registry,
  initialRole,
  initialPermissions,
  onRoleChanged,
}: {
  memberId: string;
  isChief?: boolean;
  /** كل الصلاحيات المتاحة — مجلوبة من جدول `permissions` */
  registry: PermissionDef[];
  initialRole: RoleValue;
  initialPermissions: string[];
  /** يُخطر الأب بالتغيير عشان يحدّث بادچ الدور بقائمة الأعضاء فورًا */
  onRoleChanged?: (memberId: string, role: RoleValue) => void;
}) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  /*
    الحالة محلية بالكامل ومصدرها الأول هو الـ props.
    ما في useEffect للمزامنة عمدًا: الأب بيمرر `key={memberId}` فالكومبوننت
    بينبني من جديد عند تبديل العضو، وهذا بيغني عن أي مزامنة لاحقة.
    كمان ما في router.refresh() بعد كل عملية — كان بيسبب إعادة جلب كاملة
    للصفحة فيحس المستخدم بتأخير وإعادة رسم بعد كل ضغطة.
  */
  const [role, setRole] = useState<RoleValue>(initialRole);
  const [permissions, setPermissions] = useState<string[]>(initialPermissions);
  const [error, setError] = useState<'role' | 'permission' | null>(null);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionDef[]> = {};
    for (const p of registry) {
      groups[p.category] = groups[p.category] ? [...groups[p.category], p] : [p];
    }
    return groups;
  }, [registry]);

  const handleRoleChange = useCallback(
    (next: RoleValue) => {
      if (next === role) return;
      setError(null);

      const prevRole = role;
      const prevPermissions = permissions;

      // 1) التحديث البصري فورًا — بدون انتظار السيرفر
      setRole(next);
      if (next === 'member') setPermissions([]);
      onRoleChanged?.(memberId, next);

      // 2) الحفظ بالخلفية، والتراجع فقط لو فشل
      void setMemberRole(memberId, next).catch(() => {
        setError('role');
        setRole(prevRole);
        setPermissions(prevPermissions);
        onRoleChanged?.(memberId, prevRole);
      });
    },
    [role, permissions, memberId, onRoleChanged]
  );

  const handleTogglePermission = useCallback(
    (key: string) => {
      setError(null);

      const wasGranted = permissions.includes(key);
      const prevPermissions = permissions;

      // 1) التحديث البصري فورًا
      setPermissions((prev) => (wasGranted ? prev.filter((k) => k !== key) : [...prev, key]));

      // 2) الحفظ بالخلفية، والتراجع فقط لو فشل
      void togglePermission(memberId, key, !wasGranted).catch(() => {
        setError('permission');
        setPermissions(prevPermissions);
      });
    },
    [permissions, memberId]
  );

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CARD_TRANSITION}
        aria-labelledby="roles-title"
        dir={isRTL ? 'rtl' : 'ltr'}
        className="w-full overflow-hidden rounded-2xl"
        style={palette}
      >
        <div className="flex items-center gap-3 bg-[var(--rp-header-bg)] p-5 sm:p-6 border-b border-[var(--rp-divider)]">
          <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
            <ShieldCheck size={18} className="text-[#458482]" aria-hidden="true" />
          </div>
          <div className="min-w-0 text-start">
            <h2
              id="roles-title"
              className="text-sm font-bold uppercase tracking-widest text-[var(--rp-text-main)]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.title}
            </h2>
            <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--rp-text-muted)]">
              {copy.subtitle}
            </p>
          </div>
        </div>

        {error && (
          <div className="border-b border-[var(--rp-divider)] bg-red-500/10 px-5 py-2.5 sm:px-6">
            <p className="text-xs font-medium text-red-400">
              {error === 'role' ? copy.errorRole : copy.errorPermission}
            </p>
          </div>
        )}

        {isChief ? (
          <div className="flex items-center gap-3 p-6">
            <div className="shrink-0 rounded-lg bg-[rgba(69,132,130,0.1)] p-2">
              <Lock size={16} className="text-[#458482]" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[var(--rp-text-muted)]">{copy.chiefLocked}</p>
          </div>
        ) : (
          <>
            <div className="p-5 sm:p-6">
              <RoleToggle value={role} onChange={handleRoleChange} lang={lang as Lang} />
            </div>

            <AnimatePresence initial={false}>
              {role === 'admin' && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={ROW_TRANSITION}
                  className="overflow-hidden border-t border-[var(--rp-divider)]"
                >
                  <div className="p-5 pb-2 sm:p-6 sm:pb-2">
                    <p
                      className="text-[10px] font-black uppercase tracking-wide text-[var(--rp-text-muted)]"
                      style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                    >
                      {copy.permissionsTitle}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--rp-text-muted)]">
                      {copy.permissionsHint}
                    </p>
                  </div>

                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="border-t border-[var(--rp-divider)]">
                      <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--rp-text-muted)] sm:px-5">
                        {CATEGORY_LABELS[category]?.[lang as Lang] ?? category}
                      </p>
                      {perms.map((perm, i) => (
                        <PermissionRow
                          key={perm.key}
                          permission={perm}
                          checked={permissions.includes(perm.key)}
                          isLast={i === perms.length - 1}
                          lang={lang as Lang}
                          onToggle={handleTogglePermission}
                        />
                      ))}
                    </div>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </>
        )}
      </m.section>
    </LazyMotion>
  );
}

export default memo(RolesPermissions);
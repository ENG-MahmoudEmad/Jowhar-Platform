"use client";

import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Search, Check, X, ShieldAlert, ChevronRight, ChevronDown, Lock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useCurrentUser } from '@/context/UserContext';
import { acceptMember, rejectMember, suspendMember, liftSuspension } from '@/app/(dashboard)/adminControl/actions';
import { canManage, canOpen, type Actor, type Target } from '@/lib/permissions/hierarchy';

type Lang = 'en' | 'ar';
type Role = 'admin' | 'member';

export type PendingRequest = {
  id: string;
  name: string;
  email: string;
  requestedAt: string;
};

export type Member = {
  id: string;
  name: string;
  initials: string;
  role: Role;
  roleLabel: string;
  roleLabelAr: string;
  color: string;
  isChief: boolean;
  isDeveloper: boolean;
  isSuspended: boolean;
  suspendedUntil?: string;
  /** تاريخ التسجيل — يُستخدم لترتيب باقي الأعضاء */
  createdAt: string;
};

type MembersControlStyle = React.CSSProperties & Record<`--mc-${string}`, string>;
type RowStyle = React.CSSProperties & Record<'--member-color', string>;

// ---- Layout constants ----
// Fixed row height so the list always shows exactly 5 rows worth of space,
// regardless of how many members actually exist (1 or 50).
const ROW_HEIGHT_PX = 64;
const VISIBLE_ROWS = 5;
const LIST_HEIGHT_PX = ROW_HEIGHT_PX * VISIBLE_ROWS;

// ---- Animation ----
const CARD_TRANSITION = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const ROW_TRANSITION = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

// ---- Copy ----
const TEXT = {
  en: {
    pendingTitle: 'Pending Approvals',
    pendingSubtitle: 'New members awaiting review',
    accept: 'Accept',
    reject: 'Reject',
    membersTitle: 'Members',
    membersSubtitle: 'Manage members & permissions',
    searchPlaceholder: 'Search by name or email',
    filterAll: 'All',
    filterAdmins: 'Admins',
    filterMembers: 'Members',
    active: 'Active',
    suspended: 'Suspended',
    suspend: 'Suspend',
    unsuspend: 'Lift suspension',
    days: 'days',
    confirm: 'Confirm',
    cancel: 'Cancel',
    chief: 'Chief',
    developer: 'Dev',
    you: 'You',
    locked: 'You cannot manage this member',
    viewProfile: 'View full profile',
    noPending: 'No pending requests right now',
    noResults: 'No members match your search',
    errAccept: 'Could not accept the request — it was restored.',
    errReject: 'Could not reject the request — it was restored.',
    errSuspend: 'Could not suspend — the change was reverted.',
    errLift: 'Could not lift the suspension — the change was reverted.',
  },
  ar: {
    pendingTitle: 'طلبات معلقة',
    pendingSubtitle: 'أعضاء جدد بانتظار الموافقة',
    accept: 'قبول',
    reject: 'رفض',
    membersTitle: 'الأعضاء',
    membersSubtitle: 'إدارة الأعضاء والصلاحيات',
    searchPlaceholder: 'ابحث بالاسم أو الإيميل',
    filterAll: 'الكل',
    filterAdmins: 'الأدمن',
    filterMembers: 'الأعضاء',
    active: 'نشط',
    suspended: 'موقوف',
    suspend: 'إيقاف',
    unsuspend: 'إلغاء الإيقاف',
    days: 'أيام',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    chief: 'رئيسي',
    developer: 'مطوّر',
    you: 'أنت',
    locked: 'لا تملك صلاحية إدارة هذا العضو',
    viewProfile: 'عرض الملف الكامل',
    noPending: 'لا يوجد طلبات معلقة حالياً',
    noResults: 'لا يوجد أعضاء مطابقين',
    errAccept: 'تعذّر قبول الطلب — تم استرجاعه.',
    errReject: 'تعذّر رفض الطلب — تم استرجاعه.',
    errSuspend: 'تعذّر الإيقاف — تم التراجع عن التغيير.',
    errLift: 'تعذّر إلغاء الإيقاف — تم التراجع عن التغيير.',
  },
} satisfies Record<Lang, Record<string, string>>;

function getPalette(isDark: boolean): MembersControlStyle {
  return {
    '--mc-bg': isDark ? 'var(--card)' : '#ffffff',
    '--mc-border': isDark ? 'var(--card-border)' : 'rgba(0,0,0,0.07)',
    '--mc-header-bg': isDark ? 'var(--background-alt)' : '#f5f5ef',
    '--mc-divider': isDark ? 'var(--divider)' : 'rgba(0,0,0,0.06)',
    '--mc-row-hover': isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
    '--mc-input-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    '--mc-avatar-bg': isDark ? 'var(--background)' : '#e8e8e1',
    '--mc-avatar-border': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    '--mc-text-main': 'var(--foreground)',
    '--mc-text-muted': 'var(--foreground-muted)',
    '--mc-scrollbar-thumb': isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)',
    background: 'var(--mc-bg)',
    border: '1px solid var(--mc-border)',
  };
}

// =========================================================
// Role Filter Dropdown (custom, replaces native <select>)
// =========================================================
type FilterOption = { value: 'all' | Role; label: string };

const RoleFilterDropdown = memo(function RoleFilterDropdown({
  value,
  onChange,
  lang,
  isRTL,
  copy,
}: {
  value: 'all' | Role;
  onChange: (v: 'all' | Role) => void;
  lang: Lang;
  isRTL: boolean;
  copy: (typeof TEXT)[Lang];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const options: FilterOption[] = [
    { value: 'all', label: copy.filterAll },
    { value: 'admin', label: copy.filterAdmins },
    { value: 'member', label: copy.filterMembers },
  ];

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-28 shrink-0 cursor-pointer items-center justify-between gap-2 rounded-full border border-[var(--mc-border)] bg-[var(--mc-input-bg)] px-3.5 py-2 text-xs font-medium text-[var(--mc-text-main)] outline-none transition-colors hover:border-[#458482]/40"
      >
        <span
          className="truncate"
          style={{
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            textTransform: lang === 'ar' ? 'none' : 'uppercase',
          }}
        >
          {selected.label}
        </span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className="shrink-0 text-[var(--mc-text-muted)] transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[calc(100%+6px)] z-20 min-w-full overflow-hidden rounded-xl border border-[var(--mc-border)] bg-[var(--mc-header-bg)] p-1 shadow-lg"
            style={{ [isRTL ? 'right' : 'left']: 0 }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-start text-xs font-medium transition-colors hover:bg-[var(--mc-row-hover)]"
                style={{
                  color: opt.value === value ? '#458482' : 'var(--mc-text-main)',
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.value === value ? '#458482' : 'transparent' }}
                />
                <span style={{ textTransform: lang === 'ar' ? 'none' : 'uppercase' }}>{opt.label}</span>
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// =========================================================
// Pending Request Row
// =========================================================
const PendingRow = memo(function PendingRow({
  request,
  isLast,
  lang,
  onAccept,
  onReject,
}: {
  request: PendingRequest;
  isLast: boolean;
  lang: Lang;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const copy = TEXT[lang];

  return (
    <m.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={ROW_TRANSITION}
      className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--mc-divider)' }}
    >
      <div className="min-w-0 text-start">
        <p className="truncate text-sm font-bold text-[var(--mc-text-main)]">{request.name}</p>
        <p className="truncate text-[10px] font-medium text-[var(--mc-text-muted)]">
          {request.email} · {new Date(request.requestedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onAccept(request.id)}
          className="flex cursor-pointer items-center gap-1 rounded-lg bg-[rgba(69,132,130,0.1)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#458482] transition-colors hover:bg-[rgba(69,132,130,0.18)]"
        >
          <Check size={12} aria-hidden="true" />
          {copy.accept}
        </button>
        <button
          type="button"
          onClick={() => onReject(request.id)}
          className="flex cursor-pointer items-center gap-1 rounded-lg bg-[rgba(239,68,68,0.1)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#ef4444] transition-colors hover:bg-[rgba(239,68,68,0.18)]"
        >
          <X size={12} aria-hidden="true" />
          {copy.reject}
        </button>
      </div>
    </m.div>
  );
});

// =========================================================
// Member Row
// =========================================================
const MemberRow = memo(function MemberRow({
  member,
  isLast,
  isRTL,
  lang,
  canManage,
  isSelected,
  isCurrentUser,
  isLocked,
  isEditingSuspend,
  suspendDays,
  onSuspendDaysChange,
  onStartSuspend,
  onConfirmSuspend,
  onCancelSuspend,
  onLiftSuspend,
  onSelect,
}: {
  member: Member;
  isLast: boolean;
  isRTL: boolean;
  lang: Lang;
  canManage: boolean;
  isSelected: boolean;
  isCurrentUser: boolean;
  isLocked: boolean;
  isEditingSuspend: boolean;
  suspendDays: number;
  onSuspendDaysChange: (v: number) => void;
  onStartSuspend: (id: string) => void;
  onConfirmSuspend: (id: string) => void;
  onCancelSuspend: () => void;
  onLiftSuspend: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const copy = TEXT[lang];
  const rowStyle: RowStyle = {
    '--member-color': member.color,
    borderBottom: isLast ? 'none' : '1px solid var(--mc-divider)',
    height: ROW_HEIGHT_PX,
    background: isSelected ? 'rgba(69,132,130,0.06)' : undefined,
    boxShadow: isSelected ? 'inset 3px 0 0 0 #458482' : undefined,
    opacity: isLocked ? 0.55 : 1,
  };

  return (
    <div
      id={`member-${member.id}`}
      role={isLocked ? undefined : 'button'}
      tabIndex={isLocked ? undefined : 0}
      title={isLocked ? copy.locked : undefined}
      onClick={isLocked ? undefined : () => onSelect(member.id)}
      onKeyDown={
        isLocked
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(member.id);
              }
            }
      }
      className={`group flex shrink-0 items-center gap-3 px-4 transition-colors sm:px-5 ${
        isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--mc-row-hover)]'
      }`}
      style={rowStyle}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mc-avatar-border)] bg-[var(--mc-avatar-bg)] text-xs font-bold text-[var(--member-color)]">
        {member.initials}
      </div>

      <div className="min-w-0 flex-1 text-start">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-bold text-[var(--mc-text-main)]">{member.name}</h4>
          {isCurrentUser && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
              style={{
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                color: '#ffffff',
                backgroundColor: '#458482',
              }}
            >
              {copy.you}
            </span>
          )}
          {member.isDeveloper && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
              style={{
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                color: '#c084fc',
                backgroundColor: 'rgba(192,132,252,0.12)',
              }}
            >
              {copy.developer}
            </span>
          )}
          {member.isChief && (
            <span
              className="shrink-0 rounded-full bg-[rgba(69,132,130,0.1)] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#458482]"
              style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
            >
              {copy.chief}
            </span>
          )}
        </div>
        <p
          className="truncate text-[10px] font-medium tracking-wider text-[var(--mc-text-muted)]"
          style={{
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            textTransform: lang === 'ar' ? 'none' : 'uppercase',
          }}
        >
          {lang === 'ar' ? member.roleLabelAr : member.roleLabel}
        </p>
      </div>

      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
        style={{
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          textTransform: lang === 'ar' ? 'none' : 'uppercase',
          color: member.isSuspended ? '#ef4444' : '#458482',
          backgroundColor: member.isSuspended ? 'rgba(239,68,68,0.1)' : 'rgba(69,132,130,0.1)',
        }}
      >
        {member.isSuspended ? copy.suspended : copy.active}
      </span>

      {canManage && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence mode="wait" initial={false}>
            {isEditingSuspend ? (
              <m.div
                key="editing"
                initial={{ opacity: 0, x: isRTL ? -8 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? -8 : 8 }}
                transition={ROW_TRANSITION}
                className="flex items-center gap-1.5"
              >
                <input
                  type="number"
                  min={1}
                  value={suspendDays}
                  onChange={(e) => onSuspendDaysChange(Number(e.target.value))}
                  className="w-12 rounded-md border border-[var(--mc-border)] bg-[var(--mc-input-bg)] px-2 py-1 text-center text-xs font-bold text-[var(--mc-text-main)] outline-none"
                />
                <span className="text-[9px] font-medium text-[var(--mc-text-muted)]">{copy.days}</span>
                <button
                  type="button"
                  onClick={() => onConfirmSuspend(member.id)}
                  className="cursor-pointer rounded-md bg-[rgba(239,68,68,0.1)] px-2 py-1 text-[9px] font-black uppercase text-[#ef4444] hover:bg-[rgba(239,68,68,0.18)]"
                >
                  {copy.confirm}
                </button>
                <button
                  type="button"
                  onClick={onCancelSuspend}
                  className="cursor-pointer rounded-md bg-[var(--mc-input-bg)] px-2 py-1 text-[9px] font-black uppercase text-[var(--mc-text-muted)] hover:opacity-80"
                >
                  {copy.cancel}
                </button>
              </m.div>
            ) : member.isSuspended ? (
              <m.button
                key="lift"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onLiftSuspend(member.id)}
                className="cursor-pointer rounded-lg bg-[var(--mc-input-bg)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--mc-text-muted)] transition-colors hover:text-[var(--mc-text-main)]"
              >
                {copy.unsuspend}
              </m.button>
            ) : (
              <m.button
                key="suspend"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onStartSuspend(member.id)}
                className="cursor-pointer rounded-lg bg-[var(--mc-input-bg)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--mc-text-muted)] opacity-0 transition-colors group-hover:opacity-100 hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444]"
              >
                {copy.suspend}
              </m.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* قفل للصفوف اللي ما بيقدر يديرها، وسهم للباقي (الصف كامل قابل للضغط) */}
      {isLocked ? (
        <Lock size={14} aria-hidden="true" className="shrink-0 text-[var(--mc-text-muted)]" />
      ) : (
        <ChevronRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-[var(--mc-text-muted)] transition-transform group-hover:translate-x-0.5"
          style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}
        />
      )}
    </div>
  );
});

// =========================================================
// Main Component
// =========================================================
function MembersControl({
  pending,
  members,
  onPendingChange,
  onMembersChange,
  onSelectMember,
  selectedMemberId,
}: {
  /*
    الحالة مرفوعة للأب (AdminControlClient) عشان تغييرات الدور من كومبوننت
    Roles & Permissions تنعكس فورًا على بادچ العضو بالقائمة، والعكس صحيح.
  */
  pending: PendingRequest[];
  members: Member[];
  onPendingChange: (next: PendingRequest[]) => void;
  onMembersChange: (next: Member[]) => void;
  onSelectMember?: (memberId: string) => void;
  selectedMemberId?: string | null;
}) {
  const { theme } = useTheme();
  const { lang, isRTL } = useLang();
  const { user: currentUser } = useCurrentUser();
  const isDark = theme === 'dark';
  const copy = TEXT[lang as Lang];
  const palette = useMemo(() => getPalette(isDark), [isDark]);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [suspendDays, setSuspendDays] = useState(1);
  const [actionError, setActionError] = useState<keyof typeof TEXT.en | null>(null);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = members.filter((m) => {
      const matchesQuery = !q || m.name.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesQuery && matchesRole;
    });

    /*
      ترتيب ثابت بالأولوية:
        1. Chief Admin  (دايمًا أول، مهما كان)
        2. Developer
        3. الشخص اللي فاتح الصفحة حاليًا (لو مش واحد من فوق)
        4. الباقي — حسب تاريخ التسجيل، الأقدم أولاً

      الترتيب بيصير هون مش بالـ SQL لأن المرتبة الثالثة تعتمد على
      "مين فاتح الصفحة" — وهذا معروف بالواجهة بس.
    */
    const rank = (m: Member): number => {
      if (m.isChief) return 0;
      if (m.isDeveloper) return 1;
      if (m.id === currentUser?.id) return 2;
      return 3;
    };

    return [...matched].sort((a, b) => {
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      // نفس المرتبة (الفئة الرابعة) → الأقدم تسجيلاً أولاً
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [members, query, roleFilter, currentUser?.id]);

  /*
    كل معالج تحت بيمشي بنفس النمط:
    1) يحدّث الواجهة فورًا (optimistic) — بدون انتظار السيرفر ولا تعطيل الأزرار
    2) يبعت للسيرفر بالخلفية
    3) يتراجع عن التغيير + يعرض رسالة فقط لو فشل الطلب
    ما في router.refresh() عمدًا: كان بيجبر إعادة جلب كامل للصفحة بعد كل
    ضغطة، فيحس المستخدم بتعليق وإعادة رسم.
  */

  const handleAccept = useCallback((id: string) => {
    setActionError(null);
    const prev = pending;
    onPendingChange(pending.filter((p) => p.id !== id));

    void acceptMember(id).catch(() => {
      setActionError('errAccept');
      onPendingChange(prev);
    });
  }, [pending, onPendingChange]);

  const handleReject = useCallback((id: string) => {
    setActionError(null);
    const prev = pending;
    onPendingChange(pending.filter((p) => p.id !== id));

    void rejectMember(id).catch(() => {
      setActionError('errReject');
      onPendingChange(prev);
    });
  }, [pending, onPendingChange]);

  const handleStartSuspend = useCallback((id: string) => {
    setSuspendTargetId(id);
    setSuspendDays(1);
  }, []);

  const handleCancelSuspend = useCallback(() => {
    setSuspendTargetId(null);
    setSuspendDays(1);
  }, []);

  const handleConfirmSuspend = useCallback((id: string) => {
    setActionError(null);
    const prev = members;
    const days = suspendDays;
    const until = new Date(Date.now() + days * 86400000).toISOString();

    onMembersChange(
      members.map((m) => (m.id === id ? { ...m, isSuspended: true, suspendedUntil: until } : m))
    );
    setSuspendTargetId(null);
    setSuspendDays(1);

    void suspendMember(id, days).catch(() => {
      setActionError('errSuspend');
      onMembersChange(prev);
    });
  }, [members, suspendDays, onMembersChange]);

  const handleLiftSuspend = useCallback((id: string) => {
    setActionError(null);
    const prev = members;

    onMembersChange(
      members.map((m) => (m.id === id ? { ...m, isSuspended: false, suspendedUntil: undefined } : m))
    );

    void liftSuspension(id).catch(() => {
      setActionError('errLift');
      onMembersChange(prev);
    });
  }, [members, onMembersChange]);

  return (
    <LazyMotion features={domAnimation}>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {actionError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
            {copy[actionError]}
          </div>
        )}

        {/* ---- Pending Approvals ---- */}
        {pending.length > 0 && (
          <m.section
            // id للإشعارات: طلب تسجيل جديد بيودّي لـ `/adminControl#pending-approvals`
            id="pending-approvals"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={CARD_TRANSITION}
            aria-labelledby="pending-approvals-title"
            className="w-full overflow-hidden rounded-2xl"
            style={palette}
          >
            <div className="flex items-center gap-3 bg-[var(--mc-header-bg)] p-5 sm:p-6 border-b border-[var(--mc-divider)]">
              <div className="shrink-0 rounded-lg bg-[rgba(224,167,64,0.12)] p-2">
                <ShieldAlert size={18} className="text-[#e0a740]" aria-hidden="true" />
              </div>
              <div className="min-w-0 text-start">
                <h2
                  id="pending-approvals-title"
                  className="text-sm font-bold uppercase tracking-widest text-[var(--mc-text-main)]"
                  style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
                >
                  {copy.pendingTitle}
                </h2>
                <p className="mt-0.5 text-[10px] font-medium text-[var(--mc-text-muted)]">{copy.pendingSubtitle}</p>
              </div>
              <span className="ms-auto shrink-0 rounded-full bg-[rgba(224,167,64,0.12)] px-2.5 py-1 text-[10px] font-black text-[#e0a740]">
                {pending.length}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {pending.map((p, i) => (
                <PendingRow
                  key={p.id}
                  request={p}
                  isLast={i === pending.length - 1}
                  lang={lang as Lang}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
            </AnimatePresence>
          </m.section>
        )}

        {/* ---- Members List ---- */}
        <m.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...CARD_TRANSITION, delay: 0.06 }}
          aria-labelledby="members-list-title"
          className="w-full overflow-hidden rounded-2xl"
          style={palette}
        >
          <div className="flex flex-wrap items-center gap-3 bg-[var(--mc-header-bg)] p-5 sm:p-6 border-b border-[var(--mc-divider)]">
            <div className="min-w-0 text-start">
              <h2
                id="members-list-title"
                className="text-sm font-bold uppercase tracking-widest text-[var(--mc-text-main)]"
                style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
              >
                {copy.membersTitle}
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-[var(--mc-text-muted)]">{copy.membersSubtitle}</p>
            </div>

            <div className="ms-auto flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--mc-text-muted)]" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-48 rounded-full border border-[var(--mc-border)] bg-[var(--mc-input-bg)] py-2 ps-8 pe-3 text-xs font-medium text-[var(--mc-text-main)] outline-none placeholder:text-[var(--mc-text-muted)] focus:border-[#458482]/40 sm:w-56"
                />
              </div>
              <RoleFilterDropdown
                value={roleFilter}
                onChange={setRoleFilter}
                lang={lang as Lang}
                isRTL={isRTL}
                copy={copy}
              />
            </div>
          </div>

          {/*
            Fixed-height viewport = exactly 5 rows (ROW_HEIGHT_PX * VISIBLE_ROWS).
            This keeps the card's footprint constant whether there's 1 member or 50 —
            fewer than 5 just leaves empty space below, more than 5 scrolls internally.
          */}
          <div
            className="bg-[var(--mc-bg)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--mc-scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--mc-scrollbar-thumb)]"
            style={{ height: LIST_HEIGHT_PX }}
          >
            {filteredMembers.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs font-medium text-[var(--mc-text-muted)]">{copy.noResults}</p>
              </div>
            ) : (
              filteredMembers.map((m, i) => {
                /*
                  القواعد مستوردة من '@/lib/permissions/hierarchy' — نفس الملف
                  اللي بتستخدمه الـ Server Actions، فما يصير انحراف بين اللي
                  بيُعرض بالواجهة واللي بيُسمح فعليًا بالسيرفر.

                  canOpen   = يفتح تفاصيل العضو (Add Task / Director Notes)
                  canManage = يوقّف/يغيّر دور العضو
                */
                const actor: Actor | null = currentUser
                  ? {
                      id: currentUser.id,
                      isDeveloper: currentUser.isDeveloper,
                      isChief: currentUser.isChief,
                      accessRole: currentUser.accessRole,
                    }
                  : null;

                const target: Target = {
                  id: m.id,
                  isDeveloper: m.isDeveloper,
                  isChief: m.isChief,
                  accessRole: m.role,
                };

                const rowCanOpen = actor ? canOpen(actor, target) : false;
                const rowCanManage = actor ? canManage(actor, target) : false;

                return (
                  <MemberRow
                    key={m.id}
                    member={m}
                    isLast={i === filteredMembers.length - 1}
                    isRTL={isRTL}
                    lang={lang as Lang}
                    canManage={rowCanManage}
                    isLocked={!rowCanOpen}
                    isSelected={selectedMemberId === m.id}
                    isCurrentUser={m.id === currentUser?.id}
                    isEditingSuspend={suspendTargetId === m.id}
                    suspendDays={suspendDays}
                    onSuspendDaysChange={setSuspendDays}
                    onStartSuspend={handleStartSuspend}
                    onConfirmSuspend={handleConfirmSuspend}
                    onCancelSuspend={handleCancelSuspend}
                    onLiftSuspend={handleLiftSuspend}
                    onSelect={onSelectMember ?? (() => {})}
                  />
                );
              })
            )}
          </div>
        </m.section>
      </div>
    </LazyMotion>
  );
}

export default memo(MembersControl);
//src\components\dashboard\Sidebar.tsx

"use client";

import React, { memo, useCallback, useId, useMemo, useState } from 'react';
import {
  LayoutDashboard,ShieldCheck, CheckSquare, Archive,
  Newspaper, LogOut, UserCircle, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, Languages,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';
import { useCurrentUser } from '@/context/UserContext';

type MenuItem = {
  nameEn: string;
  nameAr: string;
  icon: LucideIcon;
  path: string;
  /** Hidden unless the current user holds the matching permission. */
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { nameEn: 'Tracker Tasks', nameAr: 'متابعة المهام', icon: LayoutDashboard, path: '/dashboard' },
  { nameEn: 'My Tasks',      nameAr: 'مهامي',          icon: CheckSquare,     path: '/my-tasks' },
  { nameEn: 'Archive',       nameAr: 'الأرشيف',        icon: Archive,         path: '/archive' },
  { nameEn: 'News Feed',     nameAr: 'الأخبار',        icon: Newspaper,       path: '/news' },
  { nameEn: 'Profile',       nameAr: 'الملف الشخصي',   icon: UserCircle,      path: '/profile' },
  { nameEn: 'Admin Control', nameAr: 'لوحة تحكم الآدمن', icon: ShieldCheck,   path: '/adminControl', adminOnly: true },
];

interface SidebarProps {
  showCollapseButton?: boolean;
  /**
   * Optional override. When omitted, the value comes from the authenticated
   * user's access role (UserContext).
   *
   * Hiding the link is a convenience only — the route itself and every admin
   * API must enforce the permission server side, since anyone can type the URL.
   */
  canAccessAdminControl?: boolean;
  onSignOut?: () => void;
}

// ── Static constants — قيم ثابتة لا تتغير أبدًا ──
const SIDEBAR_BG = 'var(--sidebar-bg)';
const SIDEBAR_BORDER = 'var(--sidebar-border)';
const CARD_BORDER = 'var(--card-border)';
const DIVIDER = 'var(--divider)';
const TEXT_IDLE = 'var(--foreground-muted)';
const TEXT_MAIN = 'var(--foreground)';
const HOVER_BG = 'var(--hover-bg)';

/**
 * A nav item stays active on its nested routes too, so opening
 * /profile/[userId] keeps "Profile" lit instead of leaving nothing selected.
 */
function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

// ── Static style objects — لا تعتمد على props/state ──
const topGlowStyle: React.CSSProperties = {
  background: 'radial-gradient(circle,rgba(69,132,130,0.1) 0%,transparent 70%)',
  filter: 'blur(40px)',
};

const bottomGlowStyle: React.CSSProperties = {
  background: 'radial-gradient(circle,rgba(69,132,130,0.06) 0%,transparent 70%)',
  filter: 'blur(50px)',
};

const logoFadeTransition = { duration: 0.15 };

const navIconWrapperStyle: React.CSSProperties = { width: '44px', height: '44px' };

const navHoverOverlayStyle: React.CSSProperties = {
  background: HOVER_BG,
  transition: 'opacity 0.15s',
};

const actionIconWrapperStyle: React.CSSProperties = { width: '44px', height: '40px' };

const avatarStatusDotStyle: React.CSSProperties = {
  borderColor: SIDEBAR_BG,
  boxShadow: '0 0 5px rgba(52,211,153,0.5)',
};

// ── Sidebar nav item — معزول بـ memo عشان ما يعيد render إلا لو props تبعه تغيرت ──
interface NavItemProps {
  item: MenuItem;
  isActive: boolean;
  isOpen: boolean;
  isRTL: boolean;
  isDark: boolean;
  lang: 'en' | 'ar';
  /** Unique per Sidebar instance — see the note in Sidebar(). */
  activeLayoutId: string;
}

const SidebarNavItem = memo(function SidebarNavItem({
  item, isActive, isOpen, isRTL, isDark, lang, activeLayoutId,
}: NavItemProps) {
  const label = lang === 'ar' ? item.nameAr : item.nameEn;
  const Icon = item.icon;

  const rowStyle = useMemo<React.CSSProperties>(
    () => ({ color: isActive ? TEXT_MAIN : TEXT_IDLE, flexDirection: 'row' }),
    [isActive],
  );

  const activeOverlayStyle = useMemo<React.CSSProperties>(() => {
    if (!isActive) return {};
    return {
      background: isOpen
        ? isRTL
          ? 'linear-gradient(270deg,rgba(69,132,130,0.18) 0%,rgba(69,132,130,0.04) 100%)'
          : 'linear-gradient(90deg,rgba(69,132,130,0.18) 0%,rgba(69,132,130,0.04) 100%)'
        : 'rgba(69,132,130,0.14)',
      ...(isOpen
        ? { [isRTL ? 'borderRight' : 'borderLeft']: '2px solid #458482' }
        : { outline: '1px solid rgba(69,132,130,0.3)' }),
    };
  }, [isActive, isOpen, isRTL]);

  const iconStyle = useMemo<React.CSSProperties>(
    () => ({
      width: '18px',
      height: '18px',
      color: isActive ? '#5ea8a4' : 'currentColor',
      filter: isActive ? 'drop-shadow(0 0 5px rgba(94,168,164,0.4))' : 'none',
    }),
    [isActive],
  );

  const labelStyle = useMemo<React.CSSProperties>(
    () => ({
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      opacity: isOpen ? 1 : 0,
      maxWidth: isOpen ? 'none' : '0px',
      transition: 'opacity 0.18s ease, max-width 0.18s ease',
      flex: isOpen ? 1 : '0 0 auto',
      minWidth: 0,
      textAlign: 'start',
    }),
    [lang, isOpen],
  );

  const chevronWrapperStyle = useMemo<React.CSSProperties>(
    () => ({
      width: isOpen ? '32px' : '0px',
      opacity: isOpen ? 1 : 0,
      overflow: 'hidden',
      transition: 'width 0.18s ease, opacity 0.18s ease',
    }),
    [isOpen],
  );

  const tooltipStyle = useMemo<React.CSSProperties>(
    () => ({
      [isRTL ? 'right' : 'left']: 'calc(100% + 8px)',
      background: isDark ? '#161b22' : '#fff',
      color: TEXT_MAIN,
      border: `1px solid ${SIDEBAR_BORDER}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      transition: 'opacity 0.1s',
    }),
    [isRTL, isDark],
  );

  return (
    <div>
      <Link
        href={item.path}
        aria-current={isActive ? 'page' : undefined}
        className="block group/item relative"
      >
        <div className="relative h-11 flex items-center rounded-xl overflow-hidden" style={rowStyle}>
          {isActive && (
            <motion.div
              layoutId={activeLayoutId}
              className="absolute inset-0 rounded-xl"
              style={activeOverlayStyle}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            />
          )}
          {!isActive && (
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100"
              style={navHoverOverlayStyle}
            />
          )}

          {/* Icon — fixed 44×44 always */}
          <div className="relative z-10 shrink-0 flex items-center justify-center" style={navIconWrapperStyle}>
            <Icon className="group-hover/item:scale-110 transition-transform duration-150" style={iconStyle} />
          </div>

          {/* Label — CSS fade */}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap overflow-hidden z-10"
            style={labelStyle}
          >
            {label}
          </span>

          {/* Chevron */}
          <div className="relative z-10 shrink-0 flex justify-center" style={chevronWrapperStyle}>
            <ChevronRight
              style={{ width: '14px', height: '14px', flexShrink: 0 }}
              className={`transition-all duration-150 ${isRTL ? 'rotate-180' : ''}
                ${isActive ? 'opacity-100 text-[#458482]'
                  : `opacity-0 group-hover/item:opacity-40 ${isRTL ? 'translate-x-1 group-hover/item:translate-x-0' : '-translate-x-1 group-hover/item:translate-x-0'}`}`}
            />
          </div>
        </div>

        {/* Tooltip when collapsed */}
        {!isOpen && (
          <div
            className="absolute top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg
              text-[10px] font-bold uppercase tracking-widest whitespace-nowrap
              opacity-0 group-hover/item:opacity-100 pointer-events-none z-[200]"
            style={tooltipStyle}
          >
            {label}
          </div>
        )}
      </Link>
    </div>
  );
});

function Sidebar({
  showCollapseButton = true,
  canAccessAdminControl,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, isRTL } = useLang();

  // بيانات المستخدم الحقيقية + تسجيل الخروج الفعلي
  const {
    user,
    signOut,
    canAccessAdminControl: ctxCanAccessAdmin,
  } = useCurrentUser();

  // الـ prop تبقى override اختياري، وإلا القيمة الحقيقية من الـ context
  const canAccessAdmin = canAccessAdminControl ?? ctxCanAccessAdmin;

  /**
   * The desktop sidebar is hidden with CSS (`hidden xl:flex`), not unmounted, so
   * while the mobile drawer is open BOTH sidebars exist in the DOM. A shared
   * layoutId would make framer-motion treat their two active pills as one
   * element and animate it between them. A per-instance id keeps them separate.
   */
  const instanceId = useId();
  const activeLayoutId = `activeNav-${instanceId}`;

  const isDark = theme === 'dark';
  const cardBg = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)'),
    [isDark],
  );

  const visibleItems = useMemo(
    () => menuItems.filter((item) => !item.adminOnly || canAccessAdmin),
    [canAccessAdmin],
  );

  const CollapseIcon = isRTL
    ? (isOpen ? PanelLeftOpen : PanelLeftClose)
    : (isOpen ? PanelLeftClose : PanelLeftOpen);

  /**
   * `overflow` stays visible so the collapsed-state tooltips, which sit just
   * outside the 72px rail, are not clipped away. The decorative glows and grain
   * that previously relied on this clipping now live in their own
   * overflow-hidden layer further down.
   */
  const asideStyle = useMemo<React.CSSProperties>(
    () => ({
      width: isOpen ? '288px' : '72px',
      // flexShrink alone is not enough: a flex item can still be squeezed down to
      // its min-content width when the row runs out of room (which is what made
      // the rail narrow when the window shrank or DevTools opened). Pinning
      // minWidth to the same value makes the width genuinely fixed.
      minWidth: isOpen ? '288px' : '72px',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
      background: SIDEBAR_BG,
      borderRight: isRTL ? 'none' : `1px solid ${SIDEBAR_BORDER}`,
      borderLeft: isRTL ? `1px solid ${SIDEBAR_BORDER}` : 'none',
      overflow: 'visible',
      flexShrink: 0,
    }),
    [isOpen, isRTL],
  );

  const headerStyle = useMemo<React.CSSProperties>(
    () => ({ borderBottom: `1px solid ${DIVIDER}` }),
    [],
  );

  const logoUnderlineStyle = useMemo<React.CSSProperties>(
    () => ({
      background: isRTL
        ? 'linear-gradient(to left,#458482,transparent)'
        : 'linear-gradient(to right,#458482,transparent)',
    }),
    [isRTL],
  );

  /**
   * الأفاتار بياخد لون العضو المخصص (Member Color) بدل التدرج الثابت،
   * عشان يبقى نفس اللون المستخدم بباقي الواجهة (Gantt, DiamondGem...).
   */
  const avatarStyle = useMemo<React.CSSProperties>(() => {
    const base = user?.color ?? '#0d9488';
    return {
      background: `linear-gradient(135deg, ${base} 0%, ${base}99 100%)`,
      boxShadow: `0 4px 12px ${base}4d`,
    };
  }, [user?.color]);

  const handleCollapseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = '#5ea8a4';
    e.currentTarget.style.background = HOVER_BG;
  }, []);

  const handleCollapseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = TEXT_IDLE;
    e.currentTarget.style.background = 'transparent';
  }, []);

  const handleActionEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = TEXT_MAIN;
    e.currentTarget.style.background = HOVER_BG;
  }, []);

  const handleActionLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = TEXT_IDLE;
    e.currentTarget.style.background = 'transparent';
  }, []);

  const handleLogoutEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = '#f87171';
    e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.12)';
  }, []);

  const handleLogoutLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = TEXT_IDLE;
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.borderColor = 'transparent';
  }, []);

  const handleToggleOpen = useCallback(() => setIsOpen((o) => !o), []);

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return; // يمنع ضغطات متكررة أثناء التنفيذ
    setSigningOut(true);
    try {
      await signOut();      // Supabase signOut + مسح الجلسة + توجيه لـ /login
      onSignOut?.();        // يقفل الدرج بالموبايل لو مرّرته من الـ layout
    } finally {
      setSigningOut(false);
    }
  }, [signingOut, signOut, onSignOut]);

  const actionButtons = useMemo(
    () => [
      {
        id: 'theme',
        Icon: isDark ? Sun : Moon,
        label: isDark ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode') : (lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'),
        onClick: toggleTheme,
      },
      { id: 'lang', Icon: Languages, label: lang === 'en' ? 'العربية' : 'English', onClick: toggleLang },
    ],
    [isDark, lang, toggleTheme, toggleLang],
  );

  const actionLabelStyle = useMemo<React.CSSProperties>(
    () => ({
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      opacity: isOpen ? 1 : 0,
      maxWidth: isOpen ? '180px' : '0px',
      transition: 'opacity 0.18s ease, max-width 0.18s ease',
      flex: isOpen ? 1 : '0 0 auto',
      minWidth: 0,
      textAlign: 'start',
    }),
    [lang, isOpen],
  );

  const userCardOuterStyle = useMemo<React.CSSProperties>(
    () => ({ background: cardBg, border: `1px solid ${CARD_BORDER}` }),
    [cardBg],
  );

  const userRowStyle = useMemo<React.CSSProperties>(
    () => ({
      flexDirection: 'row',
      justifyContent: isOpen ? 'flex-start' : 'center',
      gap: isOpen ? '0.75rem' : '0',
    }),
    [isOpen],
  );

  const userNameWrapStyle = useMemo<React.CSSProperties>(
    () => ({
      opacity: isOpen ? 1 : 0,
      maxWidth: isOpen ? '160px' : '0px',
      transition: 'opacity 0.18s ease, max-width 0.18s ease',
      alignItems: isRTL ? 'flex-end' : 'flex-start',
    }),
    [isOpen, isRTL],
  );

  const logoutLabelStyle = useMemo<React.CSSProperties>(
    () => ({
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      opacity: isOpen ? 1 : 0,
      maxWidth: isOpen ? '160px' : '0px',
      transition: 'opacity 0.18s ease, max-width 0.18s ease',
    }),
    [lang, isOpen],
  );

  // النصوص المعروضة بكرت المستخدم (مع fallback أثناء التحميل)
  const displayName = user?.fullName || '—';
  const displayInitials = user?.initials || '—';
  const displayJobTitle =
    (lang === 'ar' ? user?.jobTitleAr : user?.jobTitleEn) ||
    (lang === 'ar' ? 'عضو' : 'Member');

  return (
    <aside dir={isRTL ? 'rtl' : 'ltr'} className="h-full flex flex-col select-none relative" style={asideStyle}>
      {/* Decorative layer — clipped here so the aside itself can stay visible
          for tooltips that extend past the rail. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glows */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full" style={topGlowStyle} />
        <div className="absolute -bottom-24 -right-12 w-56 h-56 rounded-full" style={bottomGlowStyle} />

        {/* Grain */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id={`sg-${instanceId}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#sg-${instanceId})`} />
          </svg>
        </div>
      </div>

      {/* Header */}
      <div className="relative h-16 sm:h-20 shrink-0 flex items-center px-3 gap-2" style={headerStyle}>
        <div className="flex-1 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={logoFadeTransition}
              >
                <Link href="/dashboard" className={`block group/logo px-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.45em] mb-0.5" style={{ color: 'rgba(69,132,130,0.6)' }}>
                    Studio
                  </p>
                  <h2
                    className="text-xl font-black uppercase leading-none whitespace-nowrap
                      group-hover/logo:text-[#5ea8a4] transition-colors duration-200"
                    style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.2em', color: TEXT_MAIN }}
                  >
                    JOWHAR
                  </h2>
                  <div className="h-[1.5px] mt-1.5 w-8 rounded-full" style={logoUnderlineStyle} />
                </Link>
              </motion.div>
            ) : (
              <motion.div
                key="mark"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={logoFadeTransition}
                className="flex justify-center"
              >
                <Link href="/dashboard">
                  <span className="text-base font-black uppercase text-[#5ea8a4]" style={{ fontFamily: "'Georgia', serif" }}>
                    J
                  </span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showCollapseButton && (
          <button
            type="button"
            onClick={handleToggleOpen}
            aria-label={isOpen
              ? (lang === 'ar' ? 'طي القائمة' : 'Collapse sidebar')
              : (lang === 'ar' ? 'توسيع القائمة' : 'Expand sidebar')}
            aria-expanded={isOpen}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: TEXT_IDLE, transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={handleCollapseEnter}
            onMouseLeave={handleCollapseLeave}
          >
            <CollapseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-visible">
        {visibleItems.map((it) => (
          <SidebarNavItem
            key={it.path}
            item={it}
            isActive={isPathActive(pathname, it.path)}
            isOpen={isOpen}
            isRTL={isRTL}
            isDark={isDark}
            lang={lang}
            activeLayoutId={activeLayoutId}
          />
        ))}
      </nav>

      {/* Theme + Language */}
      <div className="relative px-2 py-1 shrink-0" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={btn.onClick}
            aria-label={btn.label}
            className="w-full h-10 rounded-xl cursor-pointer flex items-center"
            style={{ color: TEXT_IDLE, flexDirection: 'row', transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={handleActionEnter}
            onMouseLeave={handleActionLeave}
          >
            <div className="shrink-0 flex items-center justify-center" style={actionIconWrapperStyle}>
              <btn.Icon style={{ width: '17px', height: '17px' }} />
            </div>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap overflow-hidden"
              style={actionLabelStyle}
            >
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* User card */}
      <div className="relative p-2 pb-3 shrink-0">
        <div className="rounded-2xl p-3" style={userCardOuterStyle}>
          <div className="flex items-center mb-2.5" style={userRowStyle}>
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] overflow-hidden"
                style={avatarStyle}
              >
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayInitials
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 rounded-full" style={avatarStatusDotStyle} />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden" style={userNameWrapStyle}>
              <span className="text-[11px] font-bold uppercase tracking-wider truncate whitespace-nowrap" style={{ color: TEXT_MAIN }}>
                {displayName}
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.12em] whitespace-nowrap" style={{ color: '#5ea8a4' }}>
                {displayJobTitle}
              </span>
            </div>
          </div>

          <div className="h-px mx-1 mb-2 rounded-full" style={{ background: DIVIDER }} />

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label={lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: TEXT_IDLE, flexDirection: 'row', transition: 'color 0.15s, background 0.15s, border-color 0.15s' }}
            onMouseEnter={handleLogoutEnter}
            onMouseLeave={handleLogoutLeave}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap overflow-hidden"
              style={logoutLabelStyle}
            >
              {signingOut
                ? (lang === 'ar' ? 'جارٍ الخروج...' : 'Signing out...')
                : (lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out')}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
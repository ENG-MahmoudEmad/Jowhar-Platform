"use client";

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Archive,
  Newspaper, LogOut, UserCircle, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, Languages,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { useLang } from '@/context/LangContext';

type MenuItem = {
  nameEn: string;
  nameAr: string;
  icon: LucideIcon;
  path: string;
};

const menuItems: MenuItem[] = [
  { nameEn: 'Tracker Tasks', nameAr: 'متابعة المهام', icon: LayoutDashboard, path: '/dashboard' },
  { nameEn: 'My Tasks',      nameAr: 'مهامي',          icon: CheckSquare,     path: '/my-tasks' },
  { nameEn: 'Archive',       nameAr: 'الأرشيف',        icon: Archive,         path: '/archive' },
  { nameEn: 'News Feed',     nameAr: 'الأخبار',        icon: Newspaper,       path: '/news' },
  { nameEn: 'Profile',       nameAr: 'الملف الشخصي',   icon: UserCircle,      path: '/profile' },
];

interface SidebarProps {
  showCollapseButton?: boolean;
}

// ── Static constants — قيم ثابتة لا تتغير أبدًا ──
const SIDEBAR_BG = 'var(--sidebar-bg)';
const SIDEBAR_BORDER = 'var(--sidebar-border)';
const CARD_BORDER = 'var(--card-border)';
const DIVIDER = 'var(--divider)';
const TEXT_IDLE = 'var(--foreground-muted)';
const TEXT_MAIN = 'var(--foreground)';
const HOVER_BG = 'var(--hover-bg)';

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

const avatarGradientStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg,#4e9996 0%,#2d5c5a 100%)',
  boxShadow: '0 4px 12px rgba(69,132,130,0.3)',
};

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
}

const SidebarNavItem = memo(function SidebarNavItem({
  item, isActive, isOpen, isRTL, isDark, lang,
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
      <Link href={item.path} className="block group/item relative">
        <div className="relative h-11 flex items-center rounded-xl overflow-hidden" style={rowStyle}>
          {isActive && (
            <motion.div
              layoutId="activeNav"
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

function Sidebar({ showCollapseButton = true }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, isRTL } = useLang();

  const isDark = theme === 'dark';
  const cardBg = useMemo(
    () => (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)'),
    [isDark],
  );

  const CollapseIcon = isRTL
    ? (isOpen ? PanelLeftOpen : PanelLeftClose)
    : (isOpen ? PanelLeftClose : PanelLeftOpen);

  const asideStyle = useMemo<React.CSSProperties>(
    () => ({
      width: isOpen ? '288px' : '72px',
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      background: SIDEBAR_BG,
      borderRight: isRTL ? 'none' : `1px solid ${SIDEBAR_BORDER}`,
      borderLeft: isRTL ? `1px solid ${SIDEBAR_BORDER}` : 'none',
      overflow: 'hidden',
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

  const actionButtons = useMemo(
    () => [
      {
        Icon: isDark ? Sun : Moon,
        label: isDark ? (lang === 'ar' ? 'الوضع الفاتح' : 'Light Mode') : (lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'),
        onClick: toggleTheme,
      },
      { Icon: Languages, label: lang === 'en' ? 'العربية' : 'English', onClick: toggleLang },
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

  return (
    <aside dir={isRTL ? 'rtl' : 'ltr'} className="h-full flex flex-col select-none relative" style={asideStyle}>
      {/* Glows */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none" style={topGlowStyle} />
      <div className="absolute -bottom-24 -right-12 w-56 h-56 rounded-full pointer-events-none" style={bottomGlowStyle} />

      {/* Header */}
      <div className="h-16 sm:h-20 shrink-0 flex items-center px-3 gap-2" style={headerStyle}>
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
            onClick={handleToggleOpen}
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
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map((it) => (
          <SidebarNavItem
            key={it.path}
            item={it}
            isActive={pathname === it.path}
            isOpen={isOpen}
            isRTL={isRTL}
            isDark={isDark}
            lang={lang}
          />
        ))}
      </nav>

      {/* Theme + Language */}
      <div className="px-2 py-1 shrink-0" style={{ borderTop: `1px solid ${DIVIDER}` }}>
        {actionButtons.map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
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
      <div className="p-2 pb-3 shrink-0">
        <div className="rounded-2xl p-3" style={userCardOuterStyle}>
          <div className="flex items-center mb-2.5" style={userRowStyle}>
            <div className="relative shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={avatarGradientStyle}
              >
                A
              </div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border-2 rounded-full" style={avatarStatusDotStyle} />
            </div>
            <div className="flex flex-col min-w-0 overflow-hidden" style={userNameWrapStyle}>
              <span className="text-[11px] font-bold uppercase tracking-wider truncate whitespace-nowrap" style={{ color: TEXT_MAIN }}>
                Alwaqee
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.12em] whitespace-nowrap" style={{ color: '#5ea8a4' }}>
                {lang === 'ar' ? 'محترف' : 'Animator PRO'}
              </span>
            </div>
          </div>

          <div className="h-px mx-1 mb-2 rounded-full" style={{ background: DIVIDER }} />

          <button
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer border border-transparent"
            style={{ color: TEXT_IDLE, flexDirection: 'row', transition: 'color 0.15s, background 0.15s, border-color 0.15s' }}
            onMouseEnter={handleLogoutEnter}
            onMouseLeave={handleLogoutLeave}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap overflow-hidden"
              style={logoutLabelStyle}
            >
              {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            </span>
          </button>
        </div>
      </div>

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="sg">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#sg)" />
        </svg>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
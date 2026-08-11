//src\components\dashboard\Navbar.tsx

"use client";

import React, { memo, useCallback, useMemo } from 'react';
import { Plus, Calendar as CalendarIcon, Sparkles, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { useCurrentUser } from '@/context/UserContext';
import NotificationBell from '@/components/dashboard/notifications/NotificationBell';

interface NavbarProps {
  onMenuClick?: () => void;
}

const TEXT_MAIN = 'var(--foreground)';
const TEXT_MUTED = 'var(--foreground-muted)';

// MyNotes lives on the My Tasks page. The `newNote` flag tells it to open its
// create form immediately (see MyNotes' searchParams effect).
const MY_NOTES_ROUTE = '/my-tasks';
const NEW_NOTE_HREF = `${MY_NOTES_ROUTE}?newNote=1`;

// Static style objects — لا تعتمد على props/state، فبتنشأ مرة واحدة فقط
const greetingBlockStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexDirection: 'row',
  minWidth: 0,
};

const hamburgerStyle: React.CSSProperties = {
  color: TEXT_MUTED,
  background: 'var(--hover-bg)',
  order: 0,
};

const textColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  alignItems: 'flex-start',
  minWidth: 0,
  order: 1,
};

const welcomeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexDirection: 'row',
};

const dateRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  flexDirection: 'row',
  color: TEXT_MUTED,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
};

const actionsGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexDirection: 'row',
  flexShrink: 0,
};

function Navbar({ onMenuClick }: NavbarProps) {
  const { lang, isRTL } = useLang();
  const { theme } = useTheme();
  const { user } = useCurrentUser();
  const router = useRouter();
  const isDark = theme === 'dark';

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [lang],
  );

  const headerStyle = useMemo<React.CSSProperties>(
    () => ({
      background: isDark ? 'rgba(13,17,23,0.85)' : 'rgba(249,249,243,0.85)',
      borderBottom: '1px solid var(--divider)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      gap: '0.75rem',
    }),
    [isDark],
  );

  // زر "ملاحظة جديدة" — CSS transition عادي بدل framer-motion لتفادي
  // أي تأخير (lag) بأول هوفر بسبب lazy-loading الـ domAnimation features.
  // بيصير الحركة فورية وسلسة زي الجرس تماماً.
  const addNoteButtonStyle = useMemo<React.CSSProperties>(
    () => ({
      background: '#458482',
      border: '1px solid rgba(69,132,130,0.35)',
      color: '#ffffff',
      boxShadow: '0 2px 10px rgba(69,132,130,0.28)',
      transform: 'scale(1)',
      transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
      willChange: 'transform',
    }),
    [],
  );

  const handleHamburgerEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = TEXT_MAIN;
  }, []);

  const handleHamburgerLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.color = TEXT_MUTED;
  }, []);

  const handleAddNote = useCallback(() => {
    router.push(NEW_NOTE_HREF);
  }, [router]);

  const handleAddNoteEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
  }, []);

  const handleAddNoteLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
  }, []);

  const handleAddNoteDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(0.95)';
  }, []);

  const handleAddNoteUp = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'scale(1.05)';
  }, []);

  // الاسم الأول فقط بالترحيب (نفس منطق My Tasks spec)
  const displayFirstName = user?.firstName || '';

  return (
    <header
      dir={isRTL ? 'rtl' : 'ltr'}
      className="h-16 sm:h-20 sticky top-0 z-40"
      style={headerStyle}
    >
      {/* ── Greeting block (LEFT in LTR, RIGHT in RTL) ── */}
      <div style={greetingBlockStyle}>
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="xl:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          style={hamburgerStyle}
          onMouseEnter={handleHamburgerEnter}
          onMouseLeave={handleHamburgerLeave}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Text */}
        <div style={textColumnStyle}>
          {/* مرحباً / Welcome back + name */}
          <div style={welcomeRowStyle}>
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{
                color: TEXT_MUTED,
                fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              }}
            >
              {lang === 'ar' ? 'مرحباً،' : 'Welcome back,'}
            </span>
            {/* Name always English */}
            <span
              className="font-bold text-sm tracking-wide uppercase flex items-center gap-1 whitespace-nowrap"
              style={{ color: TEXT_MAIN }}
            >
              {displayFirstName}
              <Sparkles size={13} className="text-[#458482] shrink-0" />
            </span>
          </div>

          {/* Date */}
          <div style={dateRowStyle}>
            <CalendarIcon size={11} className="text-[#458482]/70 shrink-0" />
            <span className="truncate">{today}</span>
          </div>
        </div>
      </div>

      {/* ── Quick actions: new note + bell (RIGHT in LTR, LEFT in RTL) ── */}
      <div style={actionsGroupStyle}>
        {/* New note — jumps straight into MyNotes' create form */}
        <button
          type="button"
          onClick={handleAddNote}
          onMouseEnter={handleAddNoteEnter}
          onMouseLeave={handleAddNoteLeave}
          onMouseDown={handleAddNoteDown}
          onMouseUp={handleAddNoteUp}
          aria-label={lang === 'ar' ? 'ملاحظة جديدة' : 'New note'}
          title={lang === 'ar' ? 'ملاحظة جديدة' : 'New note'}
          className="p-2.5 rounded-xl cursor-pointer shrink-0 flex items-center justify-center"
          style={addNoteButtonStyle}
        >
          <Plus size={17} />
        </button>

        {/*
          الجرس واللوحة انفصلوا لكومبوننت خاص: الـ Navbar فيه منطق كافي،
          وصف الإشعار رح يتكرر بصفحة /notifications لاحقًا.
        */}
        <NotificationBell />
      </div>
    </header>
  );
}

export default memo(Navbar);
"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

const TEXT_MAIN = 'var(--foreground)';
const TEXT_MUTED = 'var(--foreground-muted)';

// Static styles — لا تعتمد على props/state، تُنشأ مرة واحدة فقط
const studioBlockStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const dotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: '#458482',
  boxShadow: '0 0 6px rgba(69,132,130,0.7)',
  flexShrink: 0,
};

const dotAnimate = { opacity: [1, 0.3, 1], scale: [1, 0.6, 1] };
const dotTransition = { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const };

const footerInitial = { opacity: 0, y: 10 };
const footerAnimate = { opacity: 1, y: 0 };
const footerTransition = { delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

function Footer() {
  const { lang, isRTL } = useLang();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const year = useMemo(() => new Date().getFullYear(), []);

  const footerStyle = useMemo<React.CSSProperties>(
    () => ({
      background: isDark ? 'rgba(13,17,23,0.85)' : 'rgba(249,249,243,0.85)',
      borderTop: '1px solid var(--divider)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      height: '52px',
      gap: '0.75rem',
      flexShrink: 0,
    }),
    [isDark],
  );

  const studioNameStyle = useMemo<React.CSSProperties>(
    () => ({
      color: TEXT_MAIN,
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    }),
    [lang],
  );

  const copyrightStyle = useMemo<React.CSSProperties>(
    () => ({
      color: TEXT_MUTED,
      fontSize: '10px',
      fontWeight: 600,
      opacity: 0.6,
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      textAlign: 'center',
    }),
    [lang],
  );

  const badgeStyle = useMemo<React.CSSProperties>(
    () => ({
      background: 'rgba(69,132,130,0.1)',
      color: '#458482',
      border: '1px solid rgba(69,132,130,0.2)',
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      padding: '3px 10px',
      borderRadius: '999px',
      fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
      whiteSpace: 'nowrap',
    }),
    [lang],
  );

  return (
    <motion.footer
      initial={footerInitial}
      animate={footerAnimate}
      transition={footerTransition}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={footerStyle}
    >
      {/* Left — studio name */}
      <div style={studioBlockStyle}>
        {/* Tiny animated dot */}
        <motion.span
          style={dotStyle}
          animate={dotAnimate}
          transition={dotTransition}
        />
        <span style={studioNameStyle}>
          {lang === 'ar' ? 'استوديو جوهر' : 'Studio Jowhar'}
        </span>
      </div>

      {/* Center — copyright */}
      <span style={copyrightStyle}>
        {lang === 'ar'
          ? `© ${year} جميع الحقوق محفوظة لاستوديو جوهر`
          : `© ${year} All credits reserved for Jowhar Studio`}
      </span>

      {/* Right — version/status badge */}
      <span style={badgeStyle}>
        {lang === 'ar' ? 'الإصدار 1.0' : 'v1.0'}
      </span>
    </motion.footer>
  );
}

export default memo(Footer);
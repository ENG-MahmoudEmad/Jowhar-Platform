"use client"

import { useEffect } from 'react';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { removeRTLFromPage } = useLang();
  const { theme } = useTheme();

  /* ── Force LTR on auth pages regardless of language setting ── */
  useEffect(() => {
    removeRTLFromPage();
  }, []);

  return (
    <div className={theme}>
      {children}
    </div>
  );
}
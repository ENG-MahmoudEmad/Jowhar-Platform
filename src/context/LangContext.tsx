"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'en' | 'ar';

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  isRTL: boolean;
  /** استخدم هذا في dashboard layout فقط */
  applyRTLToPage: () => void;
  /** استخدم هذا في auth layout لإلغاء الـ RTL */
  removeRTLFromPage: () => void;
}

const LangContext = createContext<LangContextType>({
  lang: 'en',
  toggleLang: () => {},
  isRTL: false,
  applyRTLToPage: () => {},
  removeRTLFromPage: () => {},
});

function getStoredLang(fallback: Lang): Lang {
  if (typeof window === 'undefined') return fallback;
  const saved = window.localStorage.getItem('jowhar-lang');
  return saved === 'ar' || saved === 'en' ? saved : fallback;
}

export function LangProvider({
  children,
  initialLang = 'en',
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(() => getStoredLang(initialLang));

  useEffect(() => {
    localStorage.setItem('jowhar-lang', lang);
    document.cookie = `jowhar-lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  }, [lang]);

  const toggleLang = () => setLang(l => l === 'en' ? 'ar' : 'en');

  /** يطبّق RTL على الـ html — يُستدعى من dashboard layout */
  const applyRTLToPage = () => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  };

  /** يُعيد LTR دائماً — يُستدعى من auth layout */
  const removeRTLFromPage = () => {
    const root = document.documentElement;
    root.setAttribute('lang', 'en');
    root.setAttribute('dir', 'ltr');
  };

  return (
    <LangContext.Provider value={{
      lang,
      toggleLang,
      isRTL: lang === 'ar',
      applyRTLToPage,
      removeRTLFromPage,
    }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

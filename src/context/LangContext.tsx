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

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('jowhar-lang') as Lang | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('jowhar-lang', lang);
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
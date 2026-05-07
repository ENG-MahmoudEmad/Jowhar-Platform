//src\components\Providers.tsx

"use client"

import { ThemeProvider } from "@/context/ThemeContext";
import { LangProvider }  from "@/context/LangContext";

type Theme = 'dark' | 'light';
type Lang = 'en' | 'ar';

export default function Providers({
  children,
  initialTheme,
  initialLang,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
  initialLang: Lang;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <LangProvider initialLang={initialLang}>
        {children}
      </LangProvider>
    </ThemeProvider>
  );
}

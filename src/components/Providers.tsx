//src\components\Providers.tsx

"use client"

import { ThemeProvider } from "@/context/ThemeContext";
import { LangProvider }  from "@/context/LangContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LangProvider>
        {children}
      </LangProvider>
    </ThemeProvider>
  );
}
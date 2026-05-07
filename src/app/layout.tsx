import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Montserrat, Cairo } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "900"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "JOWHAR | Animation Studio",
  description: "Creative Workspace",
};

type Theme = "dark" | "light";
type Lang = "en" | "ar";

const themeBootScript = `
(function () {
  try {
    var theme = localStorage.getItem('jowhar-theme') || 'dark';
    var lang = localStorage.getItem('jowhar-lang') || 'en';
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';
    if (lang !== 'ar' && lang !== 'en') lang = 'en';

    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.cookie = 'jowhar-theme=' + theme + '; path=/; max-age=31536000; samesite=lax';
    document.cookie = 'jowhar-lang=' + lang + '; path=/; max-age=31536000; samesite=lax';
  } catch (_) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("jowhar-theme")?.value;
  const langCookie = cookieStore.get("jowhar-lang")?.value;
  const initialTheme: Theme = themeCookie === "light" ? "light" : "dark";
  const initialLang: Lang = langCookie === "ar" ? "ar" : "en";

  return (
    <html
      lang={initialLang}
      dir={initialLang === "ar" ? "rtl" : "ltr"}
      className={`${inter.variable} ${montserrat.variable} ${cairo.variable} h-full antialiased ${initialTheme}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)]">
        <Providers initialTheme={initialTheme} initialLang={initialLang}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

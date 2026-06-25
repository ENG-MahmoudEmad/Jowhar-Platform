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
type Lang  = "en"   | "ar";

const themeBootScript = `(function(){try{var t=localStorage.getItem('jowhar-theme')||'dark';var l=localStorage.getItem('jowhar-lang')||'en';if(t!=='light'&&t!=='dark')t='dark';if(l!=='ar'&&l!=='en')l='en';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.lang=l;r.dir=l==='ar'?'rtl':'ltr';document.cookie='jowhar-theme='+t+'; path=/; max-age=31536000; samesite=lax';document.cookie='jowhar-lang='+l+'; path=/; max-age=31536000; samesite=lax';}catch(_){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore  = await cookies();
  const themeCookie  = cookieStore.get("jowhar-theme")?.value;
  const langCookie   = cookieStore.get("jowhar-lang")?.value;
  const initialTheme: Theme = themeCookie === "light" ? "light" : "dark";
  const initialLang:  Lang  = langCookie  === "ar"    ? "ar"    : "en";

  return (
    <html
      lang={initialLang}
      dir={initialLang === "ar" ? "rtl" : "ltr"}
      className={`${inter.variable} ${montserrat.variable} ${cairo.variable} h-full antialiased ${initialTheme}`}
      suppressHydrationWarning
    >
      <head dangerouslySetInnerHTML={{ __html: `<script>${themeBootScript}</script>` }} suppressHydrationWarning />
      <body className="min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)]">
        <Providers initialTheme={initialTheme} initialLang={initialLang}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
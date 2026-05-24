"use client"

import { Newspaper } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

export default function NewsHero() {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex items-center gap-4"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(69,132,130,0.12)' }}
      >
        <Newspaper className="w-5 h-5" style={{ color: '#458482' }} />
      </div>

      <div>
        <p
          className="text-[10px] font-black uppercase tracking-[0.18em] mb-0.5"
          style={{ color: '#458482', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
        >
          {lang === 'ar' ? 'المنصة' : 'Studio'}
        </p>
        <h1
          className="text-xl font-black"
          style={{
            color:         'var(--foreground)',
            fontFamily:    lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
            letterSpacing: lang === 'ar' ? 0 : '-0.02em',
            lineHeight:    1.1,
          }}
        >
          {lang === 'ar' ? 'آخر الأخبار' : 'News Feed'}
        </h1>
        <p
          className="text-[11px] mt-1"
          style={{ color: 'var(--foreground-muted)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
        >
          {lang === 'ar'
            ? 'إعلانات وتحديثات رسمية من إدارة الاستوديو'
            : 'Official announcements & updates from studio management'
          }
        </p>
      </div>
    </div>
  )
}
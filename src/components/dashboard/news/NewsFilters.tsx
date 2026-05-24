"use client"

import React from 'react'
import { Search, X } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import type { NewsType } from './NewsFeed'

export type { NewsType }

interface NewsFiltersProps {
  search:   string
  type:     NewsType
  onSearch: (v: string) => void
  onType:   (v: NewsType) => void
}

const TYPE_FILTERS: { key: NewsType; en: string; ar: string; dot: string }[] = [
  { key: 'all',          en: 'All',          ar: 'الكل',  dot: '#458482' },
  { key: 'announcement', en: 'Announcement', ar: 'إعلان', dot: '#3b82f6' },
  { key: 'update',       en: 'Update',       ar: 'تحديث', dot: '#a855f7' },
  { key: 'alert',        en: 'Alert',        ar: 'تنبيه', dot: '#ef4444' },
]

export default function NewsFilters({ search, type, onSearch, onType }: NewsFiltersProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const bg       = isDark ? 'var(--card)'          : '#ffffff'
  const border   = isDark ? 'var(--card-border)'   : 'rgba(0,0,0,0.07)'
  const headerBg = isDark ? 'var(--background-alt)': '#f5f5ef'
  const textMain = 'var(--foreground)'
  const textMuted= 'var(--foreground-muted)'
  const inputBg  = isDark ? 'var(--input-bg)'     : '#f9f9f3'
  const inputBdr = isDark ? 'var(--input-border)' : 'rgba(0,0,0,0.09)'

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full rounded-2xl overflow-hidden"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: headerBg, borderBottom: `1px solid ${border}` }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: textMuted, [isRTL ? 'right' : 'left']: '10px' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث في الأخبار...' : 'Search news...'}
            className="w-full text-[11px] font-medium rounded-xl outline-none transition-all"
            style={{
              background:   inputBg,
              border:       `1px solid ${inputBdr}`,
              color:        textMain,
              padding:      '7px 32px',
              fontFamily:   lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
              direction:    isRTL ? 'rtl' : 'ltr',
              paddingLeft:  isRTL ? '8px'  : '30px',
              paddingRight: isRTL ? '30px' : '8px',
            }}
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ [isRTL ? 'left' : 'right']: '8px', color: textMuted }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(f => {
            const active = type === f.key
            return (
              <button
                key={f.key}
                onClick={() => onType(f.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                style={{
                  background: active ? f.dot      : 'transparent',
                  color:      active ? '#fff'      : textMuted,
                  border:     active ? 'none'      : `1px solid ${inputBdr}`,
                  fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
                }}
              >
                {!active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: f.dot }} />}
                {lang === 'ar' ? f.ar : f.en}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
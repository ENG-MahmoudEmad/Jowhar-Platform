"use client"

import React, { useMemo, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
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

const DOT_TRANSITION = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }
const PILL_TRANSITION = { type: 'spring' as const, stiffness: 480, damping: 34 }

const FilterPill = memo(function FilterPill({
  filter, active, inputBdr, textMuted, lang, onSelect,
}: {
  filter: typeof TYPE_FILTERS[number]
  active: boolean
  inputBdr: string
  textMuted: string
  lang: string
  onSelect: (key: NewsType) => void
}) {
  const handleClick = useCallback(() => onSelect(filter.key), [onSelect, filter.key])

  return (
    <motion.button
      layout
      onClick={handleClick}
      aria-pressed={active}
      transition={PILL_TRANSITION}
      animate={{
        backgroundColor: active ? filter.dot : 'rgba(0,0,0,0)',
        color: active ? '#ffffff' : textMuted,
        boxShadow: active ? `0 0 0 1px ${filter.dot}, 0 0 16px ${filter.dot}55` : `0 0 0 1px ${inputBdr}, 0 0 0 ${filter.dot}00`,
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer"
      style={{ fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}
    >
      <motion.span
        layout
        initial={false}
        animate={{
          width: active ? 0 : 6,
          opacity: active ? 0 : 1,
          marginInlineEnd: active ? 0 : 6,
        }}
        transition={DOT_TRANSITION}
        className="rounded-full shrink-0 overflow-hidden"
        style={{ height: 6, background: filter.dot }}
      />
      {lang === 'ar' ? filter.ar : filter.en}
    </motion.button>
  )
})

function NewsFilters({ search, type, onSearch, onType }: NewsFiltersProps) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const colors = useMemo(() => ({
    bg:       isDark ? 'var(--card)'          : '#ffffff',
    border:   isDark ? 'var(--card-border)'   : 'rgba(0,0,0,0.07)',
    headerBg: isDark ? 'var(--background-alt)': '#f5f5ef',
    inputBg:  isDark ? 'var(--input-bg)'     : '#f9f9f3',
    inputBdr: isDark ? 'var(--input-border)' : 'rgba(0,0,0,0.09)',
  }), [isDark])
  const textMain = 'var(--foreground)'
  const textMuted= 'var(--foreground-muted)'

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value), [onSearch])
  const handleClearSearch = useCallback(() => onSearch(''), [onSearch])

  const containerStyle = useMemo(() => ({ background: colors.bg, border: `1px solid ${colors.border}` }), [colors.bg, colors.border])
  const headerStyle = useMemo(() => ({ background: colors.headerBg, borderBottom: `1px solid ${colors.border}` }), [colors.headerBg, colors.border])
  const searchIconStyle = useMemo(() => ({ color: textMuted, [isRTL ? 'right' : 'left']: '10px' }), [isRTL])
  const clearBtnStyle = useMemo(() => ({ [isRTL ? 'left' : 'right']: '8px', color: textMuted }), [isRTL])

  const inputStyle = useMemo<React.CSSProperties>(() => ({
    background:   colors.inputBg,
    border:       `1px solid ${colors.inputBdr}`,
    color:        textMain,
    padding:      '7px 32px',
    fontFamily:   lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    direction:    isRTL ? 'rtl' : 'ltr',
    paddingLeft:  isRTL ? '8px'  : '30px',
    paddingRight: isRTL ? '30px' : '8px',
  }), [colors.inputBg, colors.inputBdr, lang, isRTL])

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full rounded-2xl overflow-hidden"
      style={containerStyle}
    >
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-3"
        style={headerStyle}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={searchIconStyle}
          />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder={lang === 'ar' ? 'ابحث في الأخبار...' : 'Search news...'}
            className="w-full text-[11px] font-medium rounded-xl outline-none transition-all"
            style={inputStyle}
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute top-1/2 -translate-y-1/2"
              style={clearBtnStyle}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <FilterPill
              key={f.key}
              filter={f}
              active={type === f.key}
              inputBdr={colors.inputBdr}
              textMuted={textMuted}
              lang={lang}
              onSelect={onType}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(NewsFilters)
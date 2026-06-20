"use client"

import React, { useMemo, useCallback, memo } from 'react'
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

  const style = useMemo(() => ({
    background: active ? filter.dot : 'transparent',
    color:      active ? '#fff'      : textMuted,
    border:     active ? 'none'      : `1px solid ${inputBdr}`,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [active, filter.dot, textMuted, inputBdr, lang])

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
      style={style}
    >
      {!active && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: filter.dot }} />}
      {lang === 'ar' ? filter.ar : filter.en}
    </button>
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
"use client"

import { memo, useCallback, useMemo } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

export type ViewMode = 'grid' | 'list'

/* ── Static handler (identical regardless of instance) ── */
const OPTIONS: { mode: ViewMode; Icon: typeof LayoutGrid }[] = [
  { mode: 'grid', Icon: LayoutGrid },
  { mode: 'list', Icon: List },
]

/**
 * Controlled Grid/List switcher, matching the pattern used by Google Drive and
 * Dropbox (two modes, not four — the professional bar is a well-built List
 * view, not more toggle states).
 *
 * Fully controlled: the caller owns `value` and receives `onChange`. This is
 * deliberate — persistence is meant to be per-user and cross-device (a
 * Supabase column, not localStorage), so the source of truth has to live above
 * this component. See BACKEND NOTE at the bottom of this file.
 */
const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
}: {
  value:    ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const { theme } = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const tx = useMemo(() => ({
    grid: lang === 'ar' ? 'شبكة' : 'Grid',
    list: lang === 'ar' ? 'قائمة' : 'List',
  }), [lang])

  const wrapStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border:     `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
  }), [isDark])

  const handleClick = useCallback((mode: ViewMode) => {
    if (mode !== value) onChange(mode)
  }, [value, onChange])

  return (
    <div
      role="radiogroup"
      aria-label={lang === 'ar' ? 'طريقة العرض' : 'View mode'}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex items-center rounded-xl p-0.5 shrink-0"
      style={wrapStyle}
    >
      {OPTIONS.map(({ mode, Icon }) => (
        <ToggleButton
          key={mode}
          mode={mode}
          Icon={Icon}
          active={value === mode}
          isDark={isDark}
          label={tx[mode]}
          onClick={handleClick}
        />
      ))}
    </div>
  )
})

const ToggleButton = memo(function ToggleButton({
  mode, Icon, active, isDark, label, onClick,
}: {
  mode:    ViewMode
  Icon:    typeof LayoutGrid
  active:  boolean
  isDark:  boolean
  label:   string
  onClick: (mode: ViewMode) => void
}) {
  const handleClick = useCallback(() => onClick(mode), [onClick, mode])

  const style = useMemo<React.CSSProperties>(() => ({
    background: active
      ? (isDark ? 'rgba(255,255,255,0.10)' : '#ffffff')
      : 'transparent',
    color:      active ? 'var(--foreground)' : 'var(--foreground-muted)',
    boxShadow:  active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
    cursor:     'pointer',
    transition: 'background 0.15s, color 0.15s',
  }), [active, isDark])

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={handleClick}
      className="flex items-center justify-center w-7 h-7 rounded-lg"
      style={style}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
})

export default ViewToggle

/* ═══════════════════════════════════════════════════════════════════════════
   BACKEND NOTE — cross-device persistence
   ═══════════════════════════════════════════════════════════════════════════
   The requirement is that the chosen view mode follows the user across
   devices (phone, another browser, etc.), not just the current browser — so
   this cannot be `localStorage`. It needs a real column, e.g.:

     alter table profiles add column archive_view_mode text
       not null default 'grid' check (archive_view_mode in ('grid','list'));

   Read it once in the Server Component that renders the archive pages and
   pass it down as the initial `value`. Write it via a small Server Action
   (`setArchiveViewMode(mode)`) on change — debounce the call slightly (e.g.
   300ms) since a user clicking back and forth between grid/list a few times
   shouldn't fire a write per click.

   Until that's wired, the pages using this component may fall back to
   `useState('grid')` with no persistence, or to localStorage as a *temporary*
   stand-in — but that must be called out as temporary wherever it's done, the
   same way the item-thumbnail data-URL stand-in is called out in
   SectionGrid.tsx, so it doesn't quietly become the permanent solution.
   ═══════════════════════════════════════════════════════════════════════════ */
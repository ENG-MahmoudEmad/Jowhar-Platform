//src\components\dashboard\archive\UndoToast.tsx
"use client"

import { memo, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Undo2, Trash2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import type { PendingDeletion } from '@/lib/useUndoableDelete'

const TOAST_STYLE_BASE: React.CSSProperties = {
  boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
}

const SingleToast = memo(function SingleToast({
  deletion, color, onUndo,
}: {
  deletion: PendingDeletion
  color:    string
  onUndo:   (id: string) => void
}) {
  const { theme } = useTheme()
  const { lang, isRTL } = useLang()
  const isDark = theme === 'dark'

  const tx = useMemo(() => ({
    deleted: lang === 'ar' ? 'حُذف' : 'Deleted',
    undo:    lang === 'ar' ? 'تراجع' : 'Undo',
  }), [lang])

  const handleUndoClick = useCallback(() => onUndo(deletion.id), [onUndo, deletion.id])

  const wrapStyle = useMemo<React.CSSProperties>(() => ({
    ...TOAST_STYLE_BASE,
    background: isDark ? '#1c232c' : '#ffffff',
    border:     `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
  }), [isDark]);

  const progressTrackStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  }), [isDark]);

  const undoBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: color + '18',
    color,
    cursor:     'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [color, lang]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="pointer-events-auto rounded-xl overflow-hidden w-72"
      style={wrapStyle}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ef444420', color: '#ef4444' }}>
          <Trash2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.deleted}: {deletion.label}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
            {deletion.secondsLeft}s
          </div>
        </div>
        <button
          type="button"
          onClick={handleUndoClick}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold shrink-0"
          style={undoBtnStyle}
        >
          <Undo2 className="w-3 h-3" />
          {tx.undo}
        </button>
      </div>

      {/* Shrinking progress bar — visual countdown, redundant with the number
          on purpose (accessible + glanceable). */}
      <div className="h-0.5 w-full" style={progressTrackStyle}>
        <div
          className="h-full"
          style={{
            width: `${deletion.percentLeft}%`,
            background: color,
            transition: 'width 0.25s linear',
          }}
        />
      </div>
    </motion.div>
  )
})

/**
 * Fixed-position stack of undo toasts. Mount one instance per
 * `useUndoableDelete()` call site (sections, items, files each get their
 * own) — stacking is handled by the `bottom` offset so multiple hosts on the
 * same page don't overlap.
 */
const UndoToastHost = memo(function UndoToastHost({
  deletions,
  onUndo,
  color = '#458482',
  bottomOffset = 0,
}: {
  deletions:    PendingDeletion[]
  onUndo:       (id: string) => void
  color?:       string
  /** px offset from the bottom, so a second host on the same page stacks
      above the first instead of overlapping it. */
  bottomOffset?: number
}) {
  const { isRTL } = useLang()

  const hostStyle = useMemo<React.CSSProperties>(() => ({
    bottom: `${16 + bottomOffset}px`,
    [isRTL ? 'left' : 'right']: '16px',
  }), [bottomOffset, isRTL]);

  return (
    <div className="fixed z-50 flex flex-col gap-2 pointer-events-none" style={hostStyle}>
      <AnimatePresence>
        {deletions.map(d => (
          <SingleToast key={d.id} deletion={d} color={color} onUndo={onUndo} />
        ))}
      </AnimatePresence>
    </div>
  )
})

export default UndoToastHost
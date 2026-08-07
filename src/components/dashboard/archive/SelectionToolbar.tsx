//src\components\dashboard\archive\SelectionToolbar.tsx
"use client"

import { memo, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, FolderInput } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

/**
 * Replaces the normal search/view-toggle toolbar row while selection mode is
 * active — same spot Google Drive/Gmail put their "N selected" bar, so
 * Copy/Move are always exactly where the search bar was, not a separate
 * floating element competing for attention.
 */
const SelectionToolbar = memo(function SelectionToolbar({
  color,
  selectedCount,
  onCopy,
  onMove,
  onCancel,
}: {
  color:         string
  selectedCount: number
  onCopy:        () => void
  onMove:        () => void
  onCancel:      () => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  const tx = useMemo(() => ({
    selected: lang === 'ar' ? 'محدد' : 'selected',
    copy:     lang === 'ar' ? 'نسخ'   : 'Copy',
    move:     lang === 'ar' ? 'نقل'   : 'Move',
  }), [lang])

  const wrapStyle = useMemo<React.CSSProperties>(() => ({
    background: isDark ? `${color}18` : `${color}0e`,
    border:     `1px solid ${color}35`,
  }), [isDark, color])

  const actionBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color:      '#ffffff',
    cursor:     'pointer',
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
  }), [color, lang])

  const handleCopyClick = useCallback(() => onCopy(), [onCopy])
  const handleMoveClick = useCallback(() => onMove(), [onMove])
  const handleCancelClick = useCallback(() => onCancel(), [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-5"
      style={wrapStyle}
    >
      <button
        type="button"
        onClick={handleCancelClick}
        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
        style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}
        title={lang === 'ar' ? 'إلغاء التحديد' : 'Cancel selection'}
      >
        <X className="w-4 h-4" />
      </button>

      <span className="text-[12.5px] font-black" style={{ color }}>
        {selectedCount} {tx.selected}
      </span>

      <div className="flex-1" />

      <button
        type="button"
        onClick={handleCopyClick}
        disabled={selectedCount === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
        style={{ ...actionBtnStyle, opacity: selectedCount === 0 ? 0.5 : 1, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer' }}
      >
        <Copy className="w-3.5 h-3.5" />
        {tx.copy}
      </button>

      <button
        type="button"
        onClick={handleMoveClick}
        disabled={selectedCount === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
        style={{ ...actionBtnStyle, opacity: selectedCount === 0 ? 0.5 : 1, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer' }}
      >
        <FolderInput className="w-3.5 h-3.5" />
        {tx.move}
      </button>
    </motion.div>
  )
})

export default SelectionToolbar
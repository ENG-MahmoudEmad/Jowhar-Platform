//src\components\dashboard\archive\DeleteConfirmModal.tsx
"use client"

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

const DEFAULT_COUNTDOWN_SECONDS = 10

const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(8px)',
  cursor: 'pointer',
}

/**
 * Replaces the earlier "hide immediately + undo toast" pattern for deletes.
 * Nothing is removed until the person explicitly clicks Confirm — and
 * Confirm stays disabled, counting down, for a forced countdown first. This
 * is deliberately heavier friction than an undo toast: deleting a section,
 * item, or file takes everything nested inside it with it, so the ask was
 * to make it hard to do by accident rather than easy to reverse after the
 * fact.
 *
 * `countdownSeconds` defaults to 10 (archive deletions). Heavier actions —
 * like permanently deleting a member account — can pass a longer countdown
 * (e.g. 15) via the prop without touching this default.
 *
 * Clicking the backdrop cancels, same as the Cancel button — no separate
 * wiring needed by callers.
 */
const DeleteConfirmModal = memo(function DeleteConfirmModal({
  label,
  message,
  countdownSeconds = DEFAULT_COUNTDOWN_SECONDS,
  onConfirm,
  onCancel,
}: {
  /** Name of the thing being deleted, shown in the title area. */
  label: string
  /** Full, already-localized warning text — callers phrase this differently
      depending on what's being deleted (a section/item warns about nested
      content; a single file doesn't need that clause). */
  message: string
  /** Forced wait before Confirm becomes clickable. Defaults to 10s. */
  countdownSeconds?: number
  onConfirm: () => void
  onCancel:  () => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  // Portal target isn't available during SSR/first paint — guard with a
  // mounted flag rather than reading `document` at module scope.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds)
  const canConfirm = secondsLeft <= 0

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  const tx = useMemo(() => ({
    title:   lang === 'ar' ? 'تأكيد الحذف'  : 'Confirm Deletion',
    cancel:  lang === 'ar' ? 'إلغاء'        : 'Cancel',
    confirm: lang === 'ar' ? 'تأكيد الحذف'  : 'Confirm Delete',
  }), [lang])

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel()
  }, [onCancel])

  const confirmBtnStyle = useMemo<React.CSSProperties>(() => ({
    background: canConfirm ? '#ef4444' : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)'),
    color:      canConfirm ? '#ffffff' : '#ef4444',
    cursor:     canConfirm ? 'pointer' : 'not-allowed',
    opacity:    canConfirm ? 1 : 0.75,
    fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
    transition: 'background 0.2s, opacity 0.2s',
  }), [canConfirm, isDark, lang])

  if (!mounted) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={MODAL_OVERLAY_STYLE}
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 24 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
        role="alertdialog"
        aria-modal="true"
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border: '1px solid rgba(239,68,68,0.25)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          cursor: 'default',
        }}
      >
        <div className="px-6 pt-6 pb-5 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.12)' }}>
            <AlertTriangle className="w-7 h-7" style={{ color: '#ef4444' }} />
          </div>

          <h2 className="text-base font-black mb-1" style={{
            color: 'var(--foreground)',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
          }}>
            {tx.title}
          </h2>

          <p className="text-[13px] font-bold mb-2" style={{ color: '#ef4444' }}>
            {label}
          </p>

          <p className="text-[12.5px] leading-relaxed" style={{
            color: 'var(--foreground-muted)',
            fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
          }}>
            {message}
          </p>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={canConfirm ? onConfirm : undefined}
            disabled={!canConfirm}
            className="w-full py-3 rounded-xl text-[13px] font-black"
            style={confirmBtnStyle}
          >
            {canConfirm ? tx.confirm : `${tx.confirm} (${secondsLeft})`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold"
            style={{
              background: 'var(--hover-bg)',
              color: 'var(--foreground-muted)',
              cursor: 'pointer',
              fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit',
            }}
          >
            {tx.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
})

export default DeleteConfirmModal
//src\components\dashboard\archive\ActionToast.tsx
"use client"

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'

const AUTO_DISMISS_MS = 3000

/**
 * A single, auto-dismissing confirmation toast — for lightweight feedback
 * ("Moved 3 items to Designs") that doesn't need an Undo action attached to
 * it. Portal'd to document.body for the same reason DeleteConfirmModal and
 * DestinationPicker are: escapes any transformed ancestor so it always sits
 * correctly regardless of where in the tree it's triggered from.
 */
export default function ActionToast({
  message,
  color = '#458482',
  onDone,
}: {
  message: string | null
  color?:  string
  onDone:  () => void
}) {
  const { isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!message) return
    const id = setTimeout(onDone, AUTO_DISMISS_MS)
    return () => clearTimeout(id)
  }, [message, onDone])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed z-[70] pointer-events-none"
      style={{ bottom: '16px', [isRTL ? 'left' : 'right']: '16px' }}
    >
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl"
            style={{
              background: isDark ? '#1c232c' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
              maxWidth: '320px',
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color }} />
            <span className="text-[12px] font-bold" style={{ color: 'var(--foreground)' }}>
              {message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}
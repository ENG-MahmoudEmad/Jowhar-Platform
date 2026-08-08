// src/lib/useArchiveViewMode.ts
"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { setArchiveViewModeAction } from '@/app/(dashboard)/archive/actions'
import type { ViewMode } from '@/components/dashboard/archive/ViewToggle'

/**
 * تفضيل Grid/List محفوظ بمستوى المستخدم كامل (عمود واحد بـprofiles)،
 * مش لكل صفحة لحالها. initialMode جاي من Server Component (قراءة أولية
 * من الداتابيز)، والتغييرات بعدين بتتحفظ بـdebounce (300ms) عشان تبديل
 * سريع بين Grid/List ما يبعت طلب لكل ضغطة.
 */
export function useArchiveViewMode(initialMode: ViewMode) {
  const [viewMode, setViewModeState] = useState<ViewMode>(initialMode)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setArchiveViewModeAction(mode).catch(() => {
        // فشل الحفظ مش حرج — التفضيل بيضل شغال بهالجلسة، وبس ما بينحفظ
        // للمرة الجاية. ما في داعي نزعج المستخدم برسالة خطأ لهيك شي بسيط.
      })
    }, 300)
  }, [])

  return [viewMode, setViewMode] as const
}
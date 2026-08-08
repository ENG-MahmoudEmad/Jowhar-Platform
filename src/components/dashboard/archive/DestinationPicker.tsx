// src/components/dashboard/archive/DestinationPicker.tsx
"use client"

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, ChevronRight, Copy, FolderInput, FolderOpen, Layers, Briefcase, FileStack } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useLang } from '@/context/LangContext'
import { SECTION_ICONS, type SectionIconKey } from '@/data/archiveMockData'
import {
  listPlatformsForPicker,
  listWorksForPicker,
  listSectionsForPicker,
  listItemsForPicker,
  type PickerPlatform,
  type PickerWork,
  type PickerSection,
  type PickerItem,
} from '@/app/(dashboard)/archive/actions'
import { destinationPickerCache } from '@/lib/destinationPickerCache'

export interface DestinationResult {
  platformId: string
  workId:     string
  sectionId?: string
  itemId?:    string
}

const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(8px)',
}

type Level = 'platforms' | 'works' | 'sections' | 'items'

/**
 * Big, navigable destination picker — نفس شكل "Move to" بـGoogle Drive.
 * البيانات هلق حقيقية بالكامل (مش Mock)، بتنجلب عند كل خطوة تصفّح
 * (drill-down) عبر Server Actions للقراءة فقط. التنفيذ الفعلي (move/copy)
 * صاير بمكان استدعاء onConfirm بالكومبوننت الأب (SectionTabs/SectionGrid/
 * FileList)، هون بس اختيار الوجهة.
 */
/** صفوف وهمية بنفس شكل صفوف القائمة الحقيقية — بدل Spinner فاضي، بتدي
    إحساس فوري إن في محتوى جاي، مش شاشة فاضية عم تنتظر. */
const SkeletonRows = memo(function SkeletonRows({ isDark }: { isDark: boolean }) {
  const rowStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  }
  return (
    <div className="space-y-1">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }}>
          <div className="w-8 h-8 rounded-lg shrink-0" style={rowStyle} />
          <div className="h-3 rounded flex-1" style={{ ...rowStyle, maxWidth: `${70 - i * 8}%` }} />
        </div>
      ))}
    </div>
  )
})

const DestinationPicker = memo(function DestinationPicker({
  color,
  targetLevel,
  actionKind,
  sourceLabel,
  excludeSectionId,
  onConfirm,
  onCancel,
}: {
  color:        string
  targetLevel:  'section' | 'work' | 'item'
  actionKind:   'copy' | 'move'
  sourceLabel:  string
  excludeSectionId?: string
  onConfirm: (destination: DestinationResult) => void | Promise<void>
  onCancel:  () => void
}) {
  const { theme }       = useTheme()
  const { lang, isRTL } = useLang()
  const isDark          = theme === 'dark'

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [platformId, setPlatformId] = useState<string | null>(null)
  const [workId,     setWorkId]     = useState<string | null>(null)
  const [sectionId,  setSectionId]  = useState<string | null>(null)

  const [platforms, setPlatforms] = useState<PickerPlatform[]>([])
  const [works,     setWorks]     = useState<PickerWork[]>([])
  const [sections,  setSections]  = useState<PickerSection[]>([])
  const [items,     setItems]     = useState<PickerItem[]>([])
  const [loading,   setLoading]   = useState(false)
  const [confirming, setConfirming] = useState(false)

  const level: Level = sectionId ? 'items' : workId ? 'sections' : platformId ? 'works' : 'platforms'

  // تحميل المنصات أول ما يفتح المودال — فوري لو بالكاش، وإلا من السيرفر
  useEffect(() => {
    const cached = destinationPickerCache.getPlatforms()
    if (cached) { setPlatforms(cached); return }

    let cancelled = false
    setLoading(true)
    listPlatformsForPicker()
      .then(data => {
        if (cancelled) return
        setPlatforms(data)
        destinationPickerCache.setPlatforms(data)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // تحميل الأعمال لما تختار منصة
  useEffect(() => {
    if (!platformId) { setWorks([]); return }

    const cached = destinationPickerCache.getWorks(platformId)
    if (cached) { setWorks(cached); return }

    let cancelled = false
    setLoading(true)
    listWorksForPicker(platformId)
      .then(data => {
        if (cancelled) return
        setWorks(data)
        destinationPickerCache.setWorks(platformId, data)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [platformId])

  // تحميل الأقسام لما تختار عمل
  useEffect(() => {
    if (!workId) { setSections([]); return }

    const cached = destinationPickerCache.getSections(workId)
    if (cached) { setSections(cached); return }

    let cancelled = false
    setLoading(true)
    listSectionsForPicker(workId)
      .then(data => {
        if (cancelled) return
        setSections(data)
        destinationPickerCache.setSections(workId, data)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [workId])

  // تحميل العناصر لما تختار قسم
  useEffect(() => {
    if (!sectionId) { setItems([]); return }

    const cached = destinationPickerCache.getItems(sectionId)
    if (cached) { setItems(cached); return }

    let cancelled = false
    setLoading(true)
    listItemsForPicker(sectionId)
      .then(data => {
        if (cancelled) return
        setItems(data)
        destinationPickerCache.setItems(sectionId, data)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sectionId])

  const platform = useMemo(() => platforms.find(p => p.id === platformId) ?? null, [platforms, platformId])
  const work     = useMemo(() => works.find(w => w.id === workId) ?? null, [works, workId])
  const section  = useMemo(() => sections.find(s => s.id === sectionId) ?? null, [sections, sectionId])

  const tx = useMemo(() => ({
    title:     actionKind === 'copy'
      ? (lang === 'ar' ? 'نسخ إلى...' : 'Copy to...')
      : (lang === 'ar' ? 'نقل إلى...' : 'Move to...'),
    archive:   lang === 'ar' ? 'الأرشيف' : 'Archive',
    here:      actionKind === 'copy'
      ? (lang === 'ar' ? 'نسخ هنا' : 'Copy Here')
      : (lang === 'ar' ? 'نقل هنا' : 'Move Here'),
    cancel:    lang === 'ar' ? 'إلغاء' : 'Cancel',
    noWorks:   lang === 'ar' ? 'لا يوجد أعمال بهذه المنصة' : 'No works in this platform',
    noSections: lang === 'ar' ? 'لا يوجد تقسيمات بهذا العمل' : 'No sections in this work',
    noItems:   lang === 'ar' ? 'لا يوجد عناصر بهذا التقسيم' : 'No items in this section',
    self:      lang === 'ar' ? 'المكان الحالي' : 'Current location',
    loading:   lang === 'ar' ? 'جاري التحميل...' : 'Loading...',
  }), [lang, actionKind])

  const handlePickPlatform = useCallback((id: string) => setPlatformId(id), [])
  const handlePickWork     = useCallback((id: string) => setWorkId(id), [])
  const handlePickSection  = useCallback((id: string) => setSectionId(id), [])

  const isDraggingFromBackdrop = useMemo(() => ({ current: false }), [])
  const handleBackdropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingFromBackdrop.current = e.target === e.currentTarget
  }, [isDraggingFromBackdrop])
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingFromBackdrop.current && e.target === e.currentTarget) onCancel()
    isDraggingFromBackdrop.current = false
  }, [isDraggingFromBackdrop, onCancel])

  const handleBreadcrumbArchive  = useCallback(() => { setPlatformId(null); setWorkId(null); setSectionId(null) }, [])
  const handleBreadcrumbPlatform = useCallback(() => { setWorkId(null); setSectionId(null) }, [])
  const handleBreadcrumbWork     = useCallback(() => setSectionId(null), [])

  const handleConfirmWork = useCallback(async (wId: string) => {
    const w = works.find(x => x.id === wId)
    if (!w || confirming) return
    setConfirming(true)
    try {
      await onConfirm({ platformId: w.platformId, workId: w.id })
    } finally {
      setConfirming(false)
    }
  }, [works, onConfirm, confirming])

  const handleConfirmSection = useCallback(async (sId: string) => {
    if (!platformId || !workId || confirming) return
    setConfirming(true)
    try {
      await onConfirm({ platformId, workId, sectionId: sId })
    } finally {
      setConfirming(false)
    }
  }, [platformId, workId, onConfirm, confirming])

  const handleConfirmItem = useCallback(async (iId: string) => {
    if (!platformId || !workId || !sectionId || confirming) return
    setConfirming(true)
    try {
      await onConfirm({ platformId, workId, sectionId, itemId: iId })
    } finally {
      setConfirming(false)
    }
  }, [platformId, workId, sectionId, onConfirm, confirming])

  if (!mounted) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={MODAL_OVERLAY_STYLE}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          maxHeight: '80vh',
          cursor: 'default',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {actionKind === 'copy'
                ? <Copy className="w-4 h-4" style={{ color }} />
                : <FolderInput className="w-4 h-4" style={{ color }} />}
              <h2 className="text-sm font-black" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)' }}>
                {tx.title}
              </h2>
            </div>
            <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: 'var(--foreground-muted)', cursor: 'pointer' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] truncate" style={{ color: 'var(--foreground-muted)' }}>
            {sourceLabel}
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="px-6 py-3 flex items-center gap-1.5 text-[11px] font-bold flex-wrap shrink-0"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={handleBreadcrumbArchive} className="hover:underline" style={{ color: level === 'platforms' ? color : 'var(--foreground-muted)', cursor: 'pointer' }}>
            {tx.archive}
          </button>
          {platform && (
            <>
              <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              <button onClick={handleBreadcrumbPlatform} className="hover:underline" style={{ color: level === 'works' ? color : 'var(--foreground-muted)', cursor: 'pointer' }}>
                {lang === 'ar' ? platform.nameAr : platform.nameEn}
              </button>
            </>
          )}
          {work && (
            <>
              <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              <button onClick={handleBreadcrumbWork} className="hover:underline" style={{ color: level === 'sections' ? color : 'var(--foreground-muted)', cursor: 'pointer' }}>
                {lang === 'ar' ? work.nameAr : work.nameEn}
              </button>
            </>
          )}
          {section && (
            <>
              <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              <span style={{ color }}>{lang === 'ar' ? section.nameAr : section.nameEn}</span>
            </>
          )}
        </div>

        {/* Browsable list */}
        <div className="px-3 py-2 overflow-y-auto custom-scrollbar flex-1" style={{ minHeight: '240px' }}>
          {loading ? (
            <SkeletonRows isDark={isDark} />
          ) : (
            <>
              {level === 'platforms' && platforms.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePickPlatform(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.color + '20' }}>
                    <Layers className="w-4 h-4" style={{ color: p.color }} />
                  </div>
                  <span className="flex-1 text-[12.5px] font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                    {lang === 'ar' ? p.nameAr : p.nameEn}
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </button>
              ))}

              {level === 'works' && (
                works.length > 0 ? works.map(w => (
                  <div key={w.id} className="flex items-center gap-2 px-1">
                    <button
                      onClick={() => handlePickWork(w.id)}
                      className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-start min-w-0"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: (platform?.color ?? color) + '20' }}>
                        <Briefcase className="w-4 h-4" style={{ color: platform?.color ?? color }} />
                      </div>
                      <span className="flex-1 text-[12.5px] font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                        {lang === 'ar' ? w.nameAr : w.nameEn}
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {targetLevel === 'work' && (
                      <button
                        onClick={() => handleConfirmWork(w.id)}
                        disabled={confirming}
                        className="px-3 py-2 rounded-lg text-[10.5px] font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#ffffff', cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.6 : 1 }}
                      >
                        {tx.here}
                      </button>
                    )}
                  </div>
                )) : (
                  <p className="text-center text-[11px] py-8" style={{ color: 'var(--foreground-muted)' }}>{tx.noWorks}</p>
                )
              )}

              {level === 'sections' && (
                sections.length > 0 ? sections.map(s => {
                  const Icon = SECTION_ICONS[s.icon as SectionIconKey] ?? FolderOpen
                  const isSelf = s.id === excludeSectionId
                  const rowContent = (
                    <>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <span className="flex-1 text-[12.5px] font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                        {lang === 'ar' ? s.nameAr : s.nameEn}
                      </span>
                      {isSelf && (
                        <span className="text-[9px] font-bold shrink-0" style={{ color: 'var(--foreground-muted)' }}>{tx.self}</span>
                      )}
                    </>
                  )
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-1">
                      {targetLevel === 'item' ? (
                        <button
                          onClick={() => handlePickSection(s.id)}
                          className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-start min-w-0"
                          style={{ cursor: 'pointer' }}
                        >
                          {rowContent}
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-0" style={{ opacity: isSelf ? 0.45 : 1 }}>
                          {rowContent}
                        </div>
                      )}

                      {targetLevel === 'section' && !isSelf && (
                        <button
                          onClick={() => handleConfirmSection(s.id)}
                          disabled={confirming}
                          className="px-3 py-2 rounded-lg text-[10.5px] font-bold shrink-0"
                          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#ffffff', cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.6 : 1 }}
                        >
                          {tx.here}
                        </button>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-center text-[11px] py-8" style={{ color: 'var(--foreground-muted)' }}>{tx.noSections}</p>
                )
              )}

              {level === 'items' && (
                items.length > 0 ? items.map(i => (
                  <div key={i.id} className="flex items-center gap-2 px-1">
                    <div className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
                        <FileStack className="w-4 h-4" style={{ color }} />
                      </div>
                      <span className="flex-1 text-[12.5px] font-bold truncate" style={{ color: 'var(--foreground)', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
                        {lang === 'ar' ? i.nameAr : i.nameEn}
                      </span>
                    </div>

                    {targetLevel === 'item' && (
                      <button
                        onClick={() => handleConfirmItem(i.id)}
                        disabled={confirming}
                        className="px-3 py-2 rounded-lg text-[10.5px] font-bold shrink-0"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#ffffff', cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.6 : 1 }}
                      >
                        {tx.here}
                      </button>
                    )}
                  </div>
                )) : (
                  <p className="text-center text-[11px] py-8" style={{ color: 'var(--foreground-muted)' }}>{tx.noItems}</p>
                )
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 flex items-center justify-end shrink-0" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[11px] font-bold"
            style={{ background: 'var(--hover-bg)', color: 'var(--foreground-muted)', cursor: 'pointer', fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'inherit' }}>
            {tx.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
})

export default DestinationPicker
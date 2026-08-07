//src\app\(dashboard)\archive\[platformId]\[workId]\[sectionId]\[itemId]\page.tsx
"use client"

import { useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useLang } from '@/context/LangContext'
import { useTheme } from '@/context/ThemeContext'
import { PLATFORMS } from '@/components/dashboard/archive/PlatformGrid'
import { WORKS } from '@/components/dashboard/archive/WorksGrid'
import { INITIAL_SECTIONS } from '@/components/dashboard/archive/SectionTabs'
import { INITIAL_ITEMS, DEFAULT_FILE_TYPES } from '@/components/dashboard/archive/SectionGrid'
import FileList from '@/components/dashboard/archive/FileList'

export default function ItemFilesPage() {
  const params  = useParams()
  const router  = useRouter()
  const { lang, isRTL } = useLang()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const platformId = params.platformId as string
  const workId      = params.workId as string
  const sectionId   = params.sectionId as string
  const itemId      = params.itemId as string

  const platform = PLATFORMS.find(
    p => p.nameEn.toLowerCase().replace(/\s+/g, '-') === platformId || p.id === platformId
  )
  const work = WORKS.find(w => w.id === workId && (platform ? w.platformId === platform.id : true))
  const section = INITIAL_SECTIONS.find(s => s.id === sectionId)
  const item = INITIAL_ITEMS.find(i => i.id === itemId && i.sectionId === sectionId)

  const platformSlug = platform?.nameEn.toLowerCase().replace(/\s+/g, '-') ?? ''
  const platformName = platform ? (lang === 'ar' ? platform.nameAr : platform.nameEn) : ''
  const workName      = work ? (lang === 'ar' ? work.nameAr : work.nameEn) : ''
  const sectionName   = section ? (lang === 'ar' ? section.nameAr : section.nameEn) : ''
  const itemName      = item ? (lang === 'ar' ? item.nameAr : item.nameEn) : ''

  const color = platform?.color ?? '#458482'

  const handleArchiveClick  = useCallback(() => router.push('/archive'), [router])
  const handlePlatformClick = useCallback(() => router.push(`/archive/${platformSlug}`), [router, platformSlug])
  const handleWorkClick     = useCallback(() => router.push(`/archive/${platformSlug}/${workId}`), [router, platformSlug, workId])

  const crumbTextStyle = useMemo<React.CSSProperties>(() => ({ color: 'var(--foreground-muted)', cursor: 'pointer', transition: 'color 0.2s' }), [])
  const handleCrumbEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>) => { e.currentTarget.style.color = color }, [color])
  const handleCrumbLeave = useCallback((e: React.MouseEvent<HTMLSpanElement>) => { e.currentTarget.style.color = 'var(--foreground-muted)' }, [])

  if (!platform || !work || !section || !item) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-32">
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
          {lang === 'ar' ? 'العنصر غير موجود' : 'Item not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Breadcrumb + item title header */}
      <div className="rounded-2xl px-6 py-5 select-none" style={{
        background: isDark ? `linear-gradient(135deg, #161b22 0%, ${color}14 100%)` : `linear-gradient(135deg, #f5f5ef 0%, ${color}0e 100%)`,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'}`,
      }}>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mb-3 flex-wrap">
          <span style={crumbTextStyle} onMouseEnter={handleCrumbEnter} onMouseLeave={handleCrumbLeave} onClick={handleArchiveClick}>
            {lang === 'ar' ? 'الأرشيف' : 'Archive'}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={crumbTextStyle} onMouseEnter={handleCrumbEnter} onMouseLeave={handleCrumbLeave} onClick={handlePlatformClick}>
            {platformName}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={crumbTextStyle} onMouseEnter={handleCrumbEnter} onMouseLeave={handleCrumbLeave} onClick={handleWorkClick}>
            {workName}
          </span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={{ color }}>{sectionName}</span>
          <ChevronRight className="w-3 h-3" style={{ color: 'var(--foreground-muted)', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          <span style={{ color: 'var(--foreground)' }}>{itemName}</span>
        </div>

        <h1 className="text-2xl font-black" style={{
          color: 'var(--foreground)',
          fontFamily: lang === 'ar' ? 'var(--font-arabic)' : 'var(--font-display)',
        }}>
          {itemName}
        </h1>
      </div>

      {/* Files */}
      <FileList item={item} color={color} fileTypes={DEFAULT_FILE_TYPES} isAdmin={true} />

    </div>
  )
}